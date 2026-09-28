import { isTauri } from "@tauri-apps/api/core";
import { openWindow } from "../api/ipc/modules/window";

/**
 * 打开（或聚焦）设置窗口。后端保证 settings 是单例窗口：已存在时仅聚焦。
 * 浏览器开发模式没有窗口管理器，降级为同页跳转顶级 /settings 路由。
 * Open (or focus) the settings window. The backend guarantees settings is a singleton:
 * an existing window is only focused. Browser dev has no window manager, so it falls back
 * to navigating to the top-level /settings route in place.
 */
export async function openSettingsWindow() {
  if (!isTauri()) {
    window.location.hash = "#/settings";
    return;
  }
  await openWindow({ kind: "settings" });
}
