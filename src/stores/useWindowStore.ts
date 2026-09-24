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
  /**
   * 即使窗口有未保存内容也关闭（用于用户确认后）。
   * Close even when the window is dirty (used after the user confirms).
   */
  forceClose: (label: string) => Promise<void>;
  setDirty: (label: string, dirty: boolean) => Promise<void>;
}

/**
 * Rust 窗口注册表的纯展示镜像；后端仍是唯一事实来源，并通过 window://changed 事件推送更新。
 * A presentation-only mirror of the Rust window registry. The backend remains the single
 * source of truth and pushes updates through the window://changed event.
 */
export const useWindowStore = create<WindowStoreState>()((set) => ({
  windows: [],
  setWindows: (windows) => set({ windows }),
  hydrate: async () => {
    const windows = await listWindows();
    set({ windows });
  },
  // 重要：下方 action 只转发 IPC 调用，从不本地修改 `windows`；后端随后会通过 window://changed 事件
  // 推送权威列表。因此 action await 完成并不代表镜像已更新，必须等事件落地后再从 store 读取状态。
  // IMPORTANT: the actions below only forward IPC calls and never mutate `windows` locally;
  // the backend pushes the authoritative list through the window://changed event afterwards. An awaited action
  // therefore does NOT mean the mirror has been updated yet; always read state from the store after the event lands.
  open: (request) => openWindow(request),
  focus: (label) => focusWindow(label),
  hide: (label) => hideWindow(label),
  close: (label) => closeWindow(label),
  forceClose: (label) => forceCloseWindow(label),
  setDirty: (label, dirty) => setWindowDirty(label, dirty),
}));
