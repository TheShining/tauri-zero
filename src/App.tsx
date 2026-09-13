import { ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import i18n from "./i18n";
import AppRouter from "./router";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAppStore } from "./stores/useAppStore";

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const locale = useAppStore((s) => s.locale);
  const primaryColor = useAppStore((s) => s.primaryColor);

  // Sync persisted close-to-tray setting to backend on startup
  useEffect(() => {
    void invoke("set_close_to_tray", { value: useAppStore.getState().closeToTray });
  }, []);

  // Keep the i18n instance in sync with the zustand locale.
  // In the main window this is redundant (LocaleSwitch already calls
  // changeLanguage), but in the tray popup the locale is updated via
  // Tauri events — without this effect, i18n would never switch.
  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);

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
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </ConfigProvider>
  );
}
