import { useEffect } from "react";
import { theme as antdTheme } from "antd";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import TrayMenu from "../components/TrayMenu";
import { useAppStore } from "../stores/useAppStore";

/**
 * Tray popup page — rendered at route /tray-popup in a dedicated
 * frameless Tauri window.  Shares the same ConfigProvider / theme /
 * i18n as the main app via App.tsx, but renders without BasicLayout.
 */
export default function TrayPopup() {
  const { token } = antdTheme.useToken();
  const theme = useAppStore((s) => s.theme);

  // Sync theme/locale from the main window via Tauri events.
  // The popup is a separate webview with its own zustand store
  // instance; persisted localStorage gives correct initial state,
  // and this listener handles runtime changes while the popup
  // webview is active.
  useEffect(() => {
    const unlisten = listen<{ theme: string; locale: string }>("app://config-changed", (event) => {
      const { theme: newTheme, locale: newLocale } = event.payload;
      useAppStore.setState({
        theme: newTheme as "light" | "dark",
        locale: newLocale as "zh-CN" | "en-US",
      });
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  // Rehydrate from localStorage when the popup gains focus.
  // The popup webview may be suspended while hidden, missing
  // config-changed events. Re-reading persisted state on focus
  // ensures the latest theme/locale is always applied.
  useEffect(() => {
    const win = getCurrentWindow();
    if (win.label !== "tray-popup") return;

    const unlisten = win.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        void useAppStore.persist.rehydrate();
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  // Set the window background CSS variable to match the Ant Design theme.
  useEffect(() => {
    document.documentElement.style.setProperty("--tray-window-bg", token.colorBgElevated);
    document.documentElement.style.colorScheme = theme;
  }, [token.colorBgElevated, theme]);

  // Auto-resize the popup window to fit the menu content exactly.
  // Only runs in the dedicated popup window — if someone navigates
  // to /tray-popup in the main window, this is a no-op.
  useEffect(() => {
    const win = getCurrentWebviewWindow();
    if (win.label !== "tray-popup") return;

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
