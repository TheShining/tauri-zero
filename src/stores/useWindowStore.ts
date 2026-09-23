import { create } from "zustand";
import {
  closeWindow,
  forceCloseWindow,
  focusWindow,
  hideWindow,
  listWindows,
  openWindow,
  setWindowDirty,
  type OpenWindowRequest,
  type OpenWindowResult,
  type WindowSnapshot,
} from "../api/ipc/modules/window";

interface WindowStoreState {
  windows: WindowSnapshot[];
  setWindows: (windows: WindowSnapshot[]) => void;
  hydrate: () => Promise<void>;
  open: (request: OpenWindowRequest) => Promise<OpenWindowResult>;
  focus: (label: string) => Promise<void>;
  hide: (label: string) => Promise<void>;
  close: (label: string) => Promise<void>;
  /** Close even when the window is dirty (used after the user confirms). */
  forceClose: (label: string) => Promise<void>;
  setDirty: (label: string, dirty: boolean) => Promise<void>;
}

/**
 * A presentation-only mirror of the Rust window registry.
 * The backend remains the single source of truth and pushes updates
 * through the window://changed event.
 */
export const useWindowStore = create<WindowStoreState>()((set) => ({
  windows: [],
  setWindows: (windows) => set({ windows }),
  hydrate: async () => {
    const windows = await listWindows();
    set({ windows });
  },
  // IMPORTANT: the actions below only forward IPC calls. They never mutate
  // `windows` locally — the backend pushes the authoritative list through
  // the window://changed event afterwards. Awaited actions therefore do NOT
  // mean the mirror has been updated yet; always read state from the store
  // after the event has landed.
  open: (request) => openWindow(request),
  focus: (label) => focusWindow(label),
  hide: (label) => hideWindow(label),
  close: (label) => closeWindow(label),
  forceClose: (label) => forceCloseWindow(label),
  setDirty: (label, dirty) => setWindowDirty(label, dirty),
}));
