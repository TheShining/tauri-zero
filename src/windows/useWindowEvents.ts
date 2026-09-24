import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { APP_EVENTS } from "../api/ipc/events";
import type { WindowSnapshot } from "../api/ipc/modules/window";
import { useWindowStore } from "./store";

/**
 * 让前端窗口镜像与 Rust WindowManager 保持同步。先注册监听器再从 `window_list` 水合，
 * 避免漏掉应用启动到页面加载之间发出的事件。
 * 本 hook 有意不使用 useTauriEvent：这里必须显式控制「先 listen 成功、再 hydrate」的顺序，
 * 该顺序保证无法封装进通用事件 hook。
 * Keeps the frontend window mirror in sync with the Rust WindowManager.
 * The listener is registered before hydrating from `window_list`, avoiding missed
 * events emitted between application startup and page load.
 * This hook deliberately does NOT use useTauriEvent: it must explicitly control the
 * "listen first, then hydrate" ordering, which cannot be encapsulated in a generic event hook.
 */
export function useWindowEvents() {
  const hydrate = useWindowStore((state) => state.hydrate);
  const setWindows = useWindowStore((state) => state.setWindows);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        const stopListening = await listen<WindowSnapshot[]>(APP_EVENTS.windowChanged, (event) => {
          setWindows(event.payload);
        });

        if (!active) {
          stopListening();
          return;
        }

        unlisten = stopListening;
        await hydrate();
      } catch (error) {
        console.error("[useWindowEvents] failed to sync window state:", error);
      }
    })();

    return () => {
      active = false;
      unlisten?.();
    };
  }, [hydrate, setWindows]);
}
