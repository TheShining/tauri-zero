import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { UnlistenFn } from "@tauri-apps/api/event";

// jsdom 中手动渲染 React 组件需要开启 act 环境标记。
// Rendering React components manually in jsdom requires the act environment flag.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

import { listen } from "@tauri-apps/api/event";
import { APP_EVENTS, type ConfigChangedPayload } from "../api/ipc/events";
import { useConfigSync } from "./useConfigSync";
import { useAppStore } from "../stores/useAppStore";

const listenMock = vi.mocked(listen);

function Probe() {
  useConfigSync();
  return null;
}

describe("useConfigSync", () => {
  let container: HTMLDivElement;
  let root: Root;
  // captured 抓出注册的回调以便手动派发 config-changed 事件。
  // captured grabs the registered callback so tests can dispatch config-changed events manually.
  let captured: ((event: unknown) => void) | undefined;

  beforeEach(() => {
    captured = undefined;
    listenMock.mockReset().mockImplementation((_event, cb) => {
      captured = cb as (event: unknown) => void;
      return Promise.resolve(vi.fn() as unknown as UnlistenFn);
    });
    // persist 中间件会在用例间复用模块状态，每个用例前重置回初始值。
    // The persist middleware reuses module state across cases, so reset to the initial values each time.
    useAppStore.setState({ theme: "light", locale: "zh-CN" });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  const emit = (payload: ConfigChangedPayload) => {
    act(() => {
      captured?.({ event: APP_EVENTS.configChanged, id: 1, payload });
    });
  };

  // 正常链路：窗口收到广播后把最新配置写入自己的 store。
  // Happy path: a window applies the broadcast config to its own store.
  it("applies incoming config to the app store", async () => {
    await act(async () => {
      root.render(<Probe />);
      await Promise.resolve();
    });

    expect(listenMock).toHaveBeenCalledWith(APP_EVENTS.configChanged, expect.any(Function));
    expect(captured).toBeDefined();

    emit({ theme: "dark", locale: "en-US" });

    expect(useAppStore.getState().theme).toBe("dark");
    expect(useAppStore.getState().locale).toBe("en-US");
  });

  // 回声防护：payload 与当前值一致时不得 setState，避免跨窗口 emit/apply 回声风暴。
  // Echo guard: when the payload matches the current values the store must not be touched,
  // preventing an emit/apply echo storm across windows.
  it("does not touch the store when values are unchanged", async () => {
    await act(async () => {
      root.render(<Probe />);
      await Promise.resolve();
    });

    const subscriber = vi.fn();
    const unsubscribe = useAppStore.subscribe(subscriber);
    emit({ theme: "light", locale: "zh-CN" });

    expect(subscriber).not.toHaveBeenCalled();
    unsubscribe();
  });
});
