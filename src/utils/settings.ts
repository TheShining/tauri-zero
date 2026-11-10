import { isTauri } from "@tauri-apps/api/core";
import { openWindow } from "../api/ipc/modules/window";

const UPDATE_REQUEST_KEY = "tauri-zero:settings-update-request";
const UPDATE_REQUEST_EVENT = "settings-update-requested";

/** 保留新窗口就绪前的单次意图；已打开的窗口同时接收 storage / 同页通知。 / Retain a one-shot intent before a new window is ready; existing windows receive storage or same-page signals. */
export function subscribeSettingsUpdate(listener: () => void) {
  const consume = () => {
    if (!localStorage.getItem(UPDATE_REQUEST_KEY)) return;
    localStorage.removeItem(UPDATE_REQUEST_KEY);
    listener();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea === localStorage && event.key === UPDATE_REQUEST_KEY && event.newValue) {
      consume();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(UPDATE_REQUEST_EVENT, consume);
  consume();
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(UPDATE_REQUEST_EVENT, consume);
  };
}

/**
 * 打开（或聚焦）设置窗口。后端保证 settings 是单例窗口：已存在时仅聚焦。
 * 浏览器开发模式没有窗口管理器，降级为同页跳转顶级 /settings 路由。
 * Open (or focus) the settings window. The backend guarantees settings is a singleton:
 * an existing window is only focused. Browser dev has no window manager, so it falls back
 * to navigating to the top-level /settings route in place.
 */
export async function openSettingsWindow(section?: "update") {
  const request = section === "update" ? crypto.randomUUID() : undefined;
  if (request) {
    localStorage.setItem(UPDATE_REQUEST_KEY, request);
    window.dispatchEvent(new Event(UPDATE_REQUEST_EVENT));
  }
  try {
    if (!isTauri()) {
      window.location.hash = "#/settings";
      return;
    }
    await openWindow({ kind: "settings" });
  } catch (error) {
    if (request && localStorage.getItem(UPDATE_REQUEST_KEY) === request) {
      localStorage.removeItem(UPDATE_REQUEST_KEY);
    }
    throw error;
  }
}
