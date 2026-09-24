import { App as AntdApp, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import { useEffect } from "react";
import { setCloseToTray } from "./api/ipc/modules/app";
import { emit } from "@tauri-apps/api/event";
import { APP_EVENTS } from "./api/ipc/events";
import i18n from "./app/i18n";
import AppRouter from "./router";
import ErrorBoundary from "./app/ErrorBoundary";
import { useAppStore } from "./stores/useAppStore";
import { useConfigSync } from "./hooks/useConfigSync";
import { useWindowEvents } from "./hooks/useWindowEvents";

export default function App() {
  useWindowEvents();
  useConfigSync();

  const theme = useAppStore((s) => s.theme);
  const locale = useAppStore((s) => s.locale);
  const primaryColor = useAppStore((s) => s.primaryColor);

  // 启动时把持久化的 close-to-tray 配置同步到后端。
  // Sync the persisted close-to-tray setting to the backend on startup.
  useEffect(() => {
    void setCloseToTray(useAppStore.getState().closeToTray).catch((error) => {
      console.error("[App] sync close-to-tray failed:", error);
    });
  }, []);

  // i18n 实例只跟随 zustand locale（changeLanguage 的唯一收口点）：各窗口收到 config-changed 广播
  // 更新 store 后，由本 effect 完成真正切换，避免组件各自调用 changeLanguage 造成多入口。
  // The i18n instance follows only the zustand locale (the single owner of changeLanguage): after each window
  // receives the config-changed broadcast and updates its store, this effect performs the actual switch,
  // preventing every component from calling changeLanguage on its own.
  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);

  // 让原生控件（滚动条等）跟随明暗主题，避免暗色主题下出现白底滚动条。
  // Keep native controls such as scrollbars aligned with the theme and avoid white scrollbars in dark mode.
  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // 广播主题/语言变更，让托盘弹窗等独立 webview 同步各自的 zustand store 实例。
  // Broadcast theme/locale changes so separate webviews such as the tray popup can sync their own zustand store instances.
  useEffect(() => {
    void emit(APP_EVENTS.configChanged, { theme, locale });
  }, [theme, locale]);

  return (
    <ConfigProvider
      locale={locale === "zh-CN" ? zhCN : enUS}
      theme={{
        algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: primaryColor },
      }}
    >
      <AntdApp>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}
