import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { theme as antdTheme } from "antd";
import { useEffect, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { emitTo } from "@tauri-apps/api/event";
import { platform } from "@tauri-apps/plugin-os";
import ThemeToggle from "./ThemeToggle";
import WindowControls from "./WindowControls";
import LocaleSwitch from "./LocaleSwitch";
import { useWindowStore } from "../stores/useWindowStore";
import { MAIN_WINDOW_LABEL } from "../api/ipc/modules/window";
import "./TitleBar.scss";

const appTitle = import.meta.env.APP_PUBLIC_APP_TITLE ?? "tauri-zero";

export default function TitleBar() {
  const { t } = useTranslation();
  const { token } = antdTheme.useToken();
  // 浏览器开发模式（pnpm dev 无 Tauri 运行时）降级为静态标题栏，三键变为 no-op。
  // In browser development without the Tauri runtime, degrade to a static title bar with no-op window controls.
  const [appWindow] = useState(() => (isTauri() ? getCurrentWindow() : null));
  const [maximized, setMaximized] = useState(false);
  // macOS 保留系统红绿灯（tauri.conf.json 的 titleBarStyle: Overlay），标题栏左侧让位且不渲染自绘三键；platform() 为同步读取。
  // macOS keeps the system traffic lights (titleBarStyle: Overlay in tauri.conf.json), so the title bar reserves the left side and renders no custom controls; platform() is a synchronous read.
  const [isMacOS] = useState(() => isTauri() && platform() === "macos");

  // 每个窗口的 webview 都有自己的 store 实例；按 label 找到当前窗口的快照。
  // Every window webview has its own store instance; look up the current window snapshot by label.
  const label = appWindow?.label ?? "main";
  const snapshot = useWindowStore((state) => state.windows.find((w) => w.label === label));
  const focused = snapshot?.focused ?? true;
  const dirty = snapshot?.dirty ?? false;
  const contextId = snapshot?.contextId;

  const isMain = label === MAIN_WINDOW_LABEL;
  const focus = useWindowStore((state) => state.focus);

  // 子窗口里的导航转发给主窗口执行（复用托盘已有的 tray://navigate 事件，定向发给 main，子窗口自己的 BasicLayout 不会收到），再把主窗口唤起聚焦。
  // Forward navigation from child windows to the main window by reusing the existing tray://navigate event,
  // targeted at main so the child window's own BasicLayout does not receive it; then bring the main window to focus.
  const handleNavClick = (to: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (isMain) return;
    event.preventDefault();
    void emitTo(MAIN_WINDOW_LABEL, "tray://navigate", to).catch((error) => {
      console.error("[TitleBar] forward navigation failed:", error);
    });
    void focus(MAIN_WINDOW_LABEL).catch((error) => {
      console.error("[TitleBar] focus main window failed:", error);
    });
  };
  // 无边框后原生标题不可见；settings/document 窗口用语义标题或上下文顶替。
  // After going frameless the native title is invisible; settings/document windows use a semantic title or context instead.
  const titleSuffix = contextId ?? (label === "settings" ? t("common.settings") : null);

  useEffect(() => {
    if (!appWindow) return;
    let mounted = true;
    const sync = () => {
      void appWindow
        .isMaximized()
        .then((value) => {
          if (mounted) setMaximized(value);
        })
        .catch(() => undefined);
    };
    sync();
    // promise-then-cleanup 处理先卸载后 resolve 的竞态，与项目既有 listen 模式一致。
    // promise-then-cleanup handles the unmount-before-resolve race, matching the project's existing listen pattern.
    const unlisten = appWindow.listen("tauri://resize", sync);
    return () => {
      mounted = false;
      void unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  // 使用手动拖拽协议，放弃 data-tauri-drag-region：左键按下 detail >= 2 视为双击（切换最大化/还原），单击开始原生拖拽；
  // data-tauri-drag-region 在最大化后不会响应双击还原，且拖拽状态无法与焦点态联动。
  // Use a manual dragging protocol and drop data-tauri-drag-region: a left-click with detail >= 2 counts as a double-click to toggle maximize/restore,
  // while a single click starts native dragging. data-tauri-drag-region does not respond to restore by double-clicking while maximized,
  // and its drag state cannot stay linked to the focused state.
  const handleRegionMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!appWindow || event.button !== 0) return;
    if (event.detail >= 2) {
      void appWindow.toggleMaximize().catch(() => undefined);
      return;
    }
    void appWindow.startDragging().catch(() => undefined);
  };

  return (
    <header
      className={`titlebar${focused ? "" : " titlebar--unfocused"}${isMacOS ? " titlebar--macos" : ""}`}
      style={{ background: token.colorBgContainer, borderBottomColor: token.colorBorderSecondary }}
    >
      <div className="titlebar__brand" onMouseDown={handleRegionMouseDown}>
        <span className="titlebar__title" style={{ color: token.colorText }}>
          {appTitle}
          {titleSuffix ? ` - ${titleSuffix}` : ""}
          {dirty ? <span className="titlebar__dirty-dot" aria-hidden="true" /> : null}
        </span>
      </div>

      <nav className="titlebar__nav">
        <Link
          to="/"
          className="titlebar__nav-link"
          style={{ color: token.colorTextSecondary }}
          onClick={handleNavClick("/")}
        >
          {t("common.home")}
        </Link>
        <Link
          to="/settings"
          className="titlebar__nav-link"
          style={{ color: token.colorTextSecondary }}
          onClick={handleNavClick("/settings")}
        >
          {t("common.settings")}
        </Link>
      </nav>

      <div className="titlebar__spacer" onMouseDown={handleRegionMouseDown} />

      <div className="titlebar__actions">
        <ThemeToggle />
        <LocaleSwitch />
      </div>

      {isMacOS ? null : <WindowControls appWindow={appWindow} maximized={maximized} />}
    </header>
  );
}
