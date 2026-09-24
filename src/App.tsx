import { App as AntdApp, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import { useEffect } from "react";
import { setCloseToTray } from "./api/ipc/modules/app";
import { emit } from "@tauri-apps/api/event";
import i18n from "./i18n";
import AppRouter from "./router";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAppStore } from "./stores/useAppStore";
import { useConfigSync } from "./hooks/useConfigSync";
import { useWindowEvents } from "./hooks/useWindowEvents";

export default function App() {
  useWindowEvents();
  useConfigSync();

  const theme = useAppStore((s) => s.theme);
  const locale = useAppStore((s) => s.locale);
  const primaryColor = useAppStore((s) => s.primaryColor);

  // Sync persisted close-to-tray setting to backend on startup
  useEffect(() => {
    void setCloseToTray(useAppStore.getState().closeToTray).catch((error) => {
      console.error("[App] sync close-to-tray failed:", error);
    });
  }, []);

  // Keep the i18n instance in sync with the zustand locale.
  // In the main window this is redundant (LocaleSwitch already calls
  // changeLanguage), but in the tray popup the locale is updated via
  // Tauri events — without this effect, i18n would never switch.
  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);

  // 让原生控件（滚动条等）跟随明暗主题，避免暗色下出现白底滚动条
  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // Broadcast theme/locale changes so the tray popup (separate webview)
  // can sync its own zustand store instance.
  useEffect(() => {
    void emit("app://config-changed", { theme, locale });
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
