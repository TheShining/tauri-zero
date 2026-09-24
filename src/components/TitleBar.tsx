import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { theme as antdTheme } from "antd";
import { useEffect, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import ThemeToggle from "./ThemeToggle";
import LocaleSwitch from "./LocaleSwitch";
import { useWindowStore } from "../stores/useWindowStore";
import "./TitleBar.scss";

const appTitle = import.meta.env.APP_PUBLIC_APP_TITLE ?? "tauri-zero";

function MinimizeIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <rect
        x="1.5"
        y="1.5"
        width="9"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <rect
        x="3.5"
        y="1"
        width="7.5"
        height="7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M1.5 3.5v7h7" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" stroke="currentColor" strokeWidth="1" />
      <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export default function TitleBar() {
  const { t } = useTranslation();
  const { token } = antdTheme.useToken();
  // 浏览器开发(pnpm dev 无 Tauri 运行时)下降级为静态标题栏，三键变为 no-op。
  const [appWindow] = useState(() => (isTauri() ? getCurrentWindow() : null));
  const [maximized, setMaximized] = useState(false);

  // 每个窗口的 webview 都有自己的 store 实例；按 label 找到当前窗口的快照。
  const label = appWindow?.label ?? "main";
  const snapshot = useWindowStore((state) => state.windows.find((w) => w.label === label));
  const focused = snapshot?.focused ?? true;
  const dirty = snapshot?.dirty ?? false;
  const contextId = snapshot?.contextId;

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
    const unlisten = appWindow.listen("tauri://resize", sync);
    return () => {
      mounted = false;
      void unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  // 手动拖拽协议，放弃 data-tauri-drag-region：
  // 左键按下 detail >= 2 视为双击（切换最大化/还原），单击开始原生拖拽。
  // data-tauri-drag-region 在最大化后不会响应双击还原，且拖拽状态无法与焦点态联动。
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
      className={`titlebar${focused ? "" : " titlebar--unfocused"}`}
      style={{ background: token.colorBgContainer, borderBottomColor: token.colorBorderSecondary }}
    >
      <div className="titlebar__brand" onMouseDown={handleRegionMouseDown}>
        <span className="titlebar__title" style={{ color: token.colorText }}>
          {appTitle}
          {contextId ? ` - ${contextId}` : ""}
          {dirty ? <span className="titlebar__dirty-dot" aria-hidden="true" /> : null}
        </span>
      </div>

      <nav className="titlebar__nav">
        <Link to="/" className="titlebar__nav-link" style={{ color: token.colorTextSecondary }}>
          {t("common.home")}
        </Link>
        <Link
          to="/settings"
          className="titlebar__nav-link"
          style={{ color: token.colorTextSecondary }}
        >
          {t("common.settings")}
        </Link>
      </nav>

      <div className="titlebar__spacer" onMouseDown={handleRegionMouseDown} />

      <div className="titlebar__actions">
        <ThemeToggle />
        <LocaleSwitch />
      </div>

      <div className="titlebar__controls">
        <button
          type="button"
          className="titlebar__control"
          aria-label={t("titlebar.minimize")}
          title={t("titlebar.minimize")}
          onClick={() => void appWindow?.minimize().catch(() => undefined)}
        >
          <MinimizeIcon />
        </button>
        <button
          type="button"
          className="titlebar__control"
          aria-label={maximized ? t("titlebar.restore") : t("titlebar.maximize")}
          title={maximized ? t("titlebar.restore") : t("titlebar.maximize")}
          onClick={() => void appWindow?.toggleMaximize().catch(() => undefined)}
        >
          {maximized ? <RestoreIcon /> : <MaximizeIcon />}
        </button>
        <button
          type="button"
          className="titlebar__control titlebar__control--close"
          aria-label={t("titlebar.close")}
          title={t("titlebar.close")}
          onClick={() => void appWindow?.close().catch(() => undefined)}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
