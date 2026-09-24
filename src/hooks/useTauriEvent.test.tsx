import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";

// jsdom 中手动渲染 React 组件需要开启 act 环境标记。
// Rendering React components manually in jsdom requires the act environment flag.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

import { listen } from "@tauri-apps/api/event";
import { useTauriEvent } from "./useTauriEvent";
import { APP_EVENTS } from "../api/ipc/events";

const listenMock = vi.mocked(listen);
type Handler = (event: Event<string>) => void;

function Probe({ handler }: { handler: Handler }) {
  useTauriEvent(APP_EVENTS.trayNavigate, handler);
  return null;
}

describe("useTauriEvent", () => {
  let container: HTMLDivElement;
  let root: Root;
  let captured: ((event: unknown) => void) | undefined;
  let unlisten: ReturnType<typeof vi.fn>;

  // listen resolve 后返回 unlisten 函数；captured 抓出注册的回调以便手动派发事件。
  // listen resolves with an unlisten function; captured grabs the registered callback
  // so tests can dispatch events manually.
  beforeEach(() => {
    captured = undefined;
    unlisten = vi.fn();
    listenMock.mockReset().mockImplementation((_event, cb) => {
      captured = cb as (event: unknown) => void;
      return Promise.resolve(unlisten as unknown as UnlistenFn);
    });
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

  // 正常链路：订阅一次并收到 payload。
  // Happy path: subscribes once and receives the payload.
  it("subscribes and forwards payloads to the handler", async () => {
    const handler = vi.fn();
    await act(async () => {
      root.render(<Probe handler={handler} />);
      await Promise.resolve();
    });

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledWith(APP_EVENTS.trayNavigate, expect.any(Function));
    expect(captured).toBeDefined();

    act(() => {
      captured?.({ event: APP_EVENTS.trayNavigate, id: 1, payload: "/settings" });
    });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ payload: "/settings" }));
  });

  // handler 身份每次渲染都变化时不得重新订阅，且事件路由到最新 handler。
  // A changing handler identity must not re-subscribe, and events must reach the latest handler.
  it("uses the latest handler without re-subscribing", async () => {
    const first = vi.fn();
    const second = vi.fn();
    await act(async () => {
      root.render(<Probe handler={first} />);
      await Promise.resolve();
    });
    await act(async () => {
      root.render(<Probe handler={second} />);
      await Promise.resolve();
    });

    expect(listenMock).toHaveBeenCalledTimes(1);

    act(() => {
      captured?.({ event: APP_EVENTS.trayNavigate, id: 2, payload: "/" });
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  // 卸载后调用 unlisten，监听器不泄漏。
  // After unmount the unlisten function runs, so the listener never leaks.
  it("unsubscribes on unmount", async () => {
    await act(async () => {
      root.render(<Probe handler={vi.fn()} />);
      await Promise.resolve();
    });

    // 标记 root 已卸载，避免 afterEach 二次 unmount 干扰断言。
    // Mark the root as unmounted so the second unmount in afterEach cannot skew assertions.
    const originalRoot = root;
    root = { unmount: () => undefined } as unknown as Root;
    await act(async () => {
      originalRoot.unmount();
      await Promise.resolve();
    });

    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
