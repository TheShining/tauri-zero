import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { WINDOW_CHANGED_EVENT, type WindowSnapshot } from "../api/ipc/modules/window";
import { useWindowStore } from "../stores/useWindowStore";

/**
 * Keeps the frontend window mirror in sync with the Rust WindowManager.
 *
 * The listener is registered before hydrating from `window_list`. That avoids
 * missing an event emitted between application startup and page load.
 */
export function useWindowEvents() {
  const hydrate = useWindowStore((state) => state.hydrate);
  const setWindows = useWindowStore((state) => state.setWindows);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        const stopListening = await listen<WindowSnapshot[]>(WINDOW_CHANGED_EVENT, (event) => {
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
