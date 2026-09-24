import { useTranslation } from "react-i18next";
import type { Window as TauriWindow } from "@tauri-apps/api/window";
import { CloseIcon, MaximizeIcon, MinimizeIcon, RestoreIcon } from "./TitleBarIcons";

interface WindowControlsProps {
  /**
   * 当前窗口句柄；浏览器开发模式下为 null，三键自动变为 no-op。
   * Current window handle; null in browser development mode, where the buttons become no-ops.
   */
  appWindow: TauriWindow | null;
  /**
   * 是否已最大化，决定中间按钮显示最大化还是还原图标。
   * Whether the window is maximized; decides if the middle button shows the maximize or restore icon.
   */
  maximized: boolean;
}

/**
 * 自绘的窗口最小化 / 最大化 / 关闭三键。macOS 保留系统红绿灯，由调用方决定是否渲染本组件。
 * Custom minimize / maximize / close buttons. macOS keeps the system traffic lights, so the caller decides whether to render this component.
 */
export default function WindowControls({ appWindow, maximized }: WindowControlsProps) {
  const { t } = useTranslation();
  return (
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
  );
}
