import type { Locale, ThemeMode } from "../../stores/useAppStore";
import type { WindowSnapshot } from "./modules/window";

// 集中管理全部自定义 Tauri 事件名：统一命名空间与单一注册点，
// 避免事件字符串散落各模块导致拼写不一致难以发现。
// Central registry for all custom Tauri event names: a single namespace and registration
// point, preventing scattered event strings whose typos and drift are hard to spot.
export const APP_EVENTS = {
  /** 全局配置（主题/语言）变更广播。 / Global config (theme/locale) change broadcast. */
  configChanged: "app://config-changed",
  /** 托盘触发的导航指令，payload 为目标路由路径。 / Tray-triggered navigation; payload is the target route path. */
  trayNavigate: "tray://navigate",
  /** 托盘触发的更新检查。 / Tray-triggered update check. */
  trayCheckUpdate: "tray://check-update",
  /** 后端窗口注册表快照推送。 / Backend window-registry snapshot push. */
  windowChanged: "window://changed",
  /** 后端请求当前窗口确认关闭（有未保存内容）。 / Backend asks this window to confirm closing (unsaved content). */
  windowConfirmClose: "window://confirm-close",
} as const;

export type AppEventName = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

export interface ConfigChangedPayload {
  theme: ThemeMode;
  locale: Locale;
}

// 事件名到 payload 类型的映射：供 useTauriEvent / emit 按名推断 payload 类型，
// 新增事件时必须在此登记。
// Map from event name to payload type, letting useTauriEvent / emit infer payload types
// by name. Every new event must be registered here.
export interface AppEventPayloadMap {
  [APP_EVENTS.configChanged]: ConfigChangedPayload;
  [APP_EVENTS.trayNavigate]: string;
  [APP_EVENTS.trayCheckUpdate]: null;
  [APP_EVENTS.windowChanged]: WindowSnapshot[];
  [APP_EVENTS.windowConfirmClose]: string;
}
