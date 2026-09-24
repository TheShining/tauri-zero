import { useEffect } from "react";
import { theme as antdTheme } from "antd";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import TrayMenu from "./TrayMenu";
import { WINDOW_LABELS } from "../../windows/constants";
import { useAppStore } from "../../stores/useAppStore";

/**
 * 托盘弹窗页面，在专用无边框 Tauri 窗口中通过 /tray-popup 路由渲染；
 * 经 App.tsx 共享主应用的 ConfigProvider、主题与 i18n，但不渲染 BasicLayout。
 * Tray popup page rendered at route /tray-popup in a dedicated frameless Tauri window.
 * It shares the main app's ConfigProvider, theme, and i18n through App.tsx but renders without BasicLayout.
 */
export default function TrayPopup() {
  const { token } = antdTheme.useToken();
  const theme = useAppStore((s) => s.theme);

  // 托盘弹窗重新获得焦点时从 localStorage 重新水合。隐藏期间弹窗 webview 可能被挂起并错过
  // config-changed 事件；聚焦时重读持久化状态可确保主题和语言始终最新。
  // Rehydrate from localStorage when the popup gains focus. The popup webview may be suspended while hidden
  // and miss config-changed events; re-reading persisted state on focus ensures the latest theme and locale are applied.
  useEffect(() => {
    const win = getCurrentWindow();
    if (win.label !== WINDOW_LABELS.trayPopup) return;

    const unlisten = win.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        void useAppStore.persist.rehydrate();
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  // 设置窗口背景 CSS 变量以匹配 Ant Design 主题。
  // Set the window background CSS variable to match the Ant Design theme.
  useEffect(() => {
    document.documentElement.style.setProperty("--tray-window-bg", token.colorBgElevated);
    document.documentElement.style.colorScheme = theme;
  }, [token.colorBgElevated, theme]);

  // 自动调整弹窗尺寸以精确适配菜单内容；只在专用弹窗窗口生效，如果用户在主窗口导航到 /tray-popup 则为 no-op。
  // Auto-resize the popup window to fit the menu content exactly. This only runs in the dedicated popup window;
  // if someone navigates to /tray-popup in the main window, it is a no-op.
  useEffect(() => {
    const win = getCurrentWebviewWindow();
    if (win.label !== WINDOW_LABELS.trayPopup) return;

    const menu = document.querySelector<HTMLElement>(".tray-menu");
    if (!menu) return;

    const resize = async () => {
      const rect = menu.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        await win.setSize(new LogicalSize(Math.ceil(rect.width), Math.ceil(rect.height)));
      }
    };

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        void resize();
      }),
    );

    const observer = new ResizeObserver(() => void resize());
    observer.observe(menu);

    return () => observer.disconnect();
  }, [theme]);

  return <TrayMenu />;
}
