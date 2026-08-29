import { ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import AppRouter from "./router";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAppStore } from "./stores/useAppStore";

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const locale = useAppStore((s) => s.locale);

  return (
    <ConfigProvider
      locale={locale === "zh-CN" ? zhCN : enUS}
      theme={{
        algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: "#1677ff" },
      }}
    >
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </ConfigProvider>
  );
}
