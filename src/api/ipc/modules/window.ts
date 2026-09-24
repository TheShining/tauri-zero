import { ipcInvoke } from "../client";

export const MAIN_WINDOW_LABEL = "main";
export const WINDOW_CHANGED_EVENT = "window://changed";
export const WINDOW_CONFIRM_CLOSE_EVENT = "window://confirm-close";

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
