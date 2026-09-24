import { ipcInvoke } from "../client";

export const MAIN_WINDOW_LABEL = "main";

export type WindowKind = "main" | "tray-popup" | "settings" | "document";

export interface OpenWindowRequest {
  readonly kind: WindowKind;
  readonly contextId?: string;
}

export interface OpenWindowResult {
  readonly label: string;
  readonly created: boolean;
}

export interface WindowSnapshot {
  readonly label: string;
  readonly kind: WindowKind;
  readonly contextId?: string;
  readonly visible: boolean;
  readonly focused: boolean;
  readonly dirty: boolean;
}

export function openWindow(request: OpenWindowRequest) {
  return ipcInvoke<OpenWindowResult>("window_open", { request });
}

export function listWindows() {
  return ipcInvoke<WindowSnapshot[]>("window_list");
}

export function focusWindow(label: string) {
  return ipcInvoke<void>("window_focus", { label });
}

export function hideWindow(label: string) {
  return ipcInvoke<void>("window_hide", { label });
}

export function closeWindow(label: string) {
  return ipcInvoke<void>("window_close", { label });
}

export function forceCloseWindow(label: string) {
  return ipcInvoke<void>("window_force_close", { label });
}

export function setWindowDirty(label: string, dirty: boolean) {
  return ipcInvoke<void>("window_set_dirty", { label, dirty });
}

/**
 * 通知后端当前窗口的页面首帧已就绪、可安全显示，消除白屏闪烁。
 * 窗口 label 由后端从调用方的 webview 推导，无需传参；刻意隐藏的窗口（托盘弹窗）会被后端忽略。
 * Tells the backend that this window's page has painted its first frame and is safe to show,
 * eliminating the white flash. The backend derives the label from the calling webview, so no
 * argument is needed; intentionally hidden windows (the tray popup) are ignored by the backend.
 */
export function revealWindow() {
  return ipcInvoke<void>("window_reveal");
}
