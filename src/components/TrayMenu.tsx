import { theme } from "antd";
import { useTranslation } from "react-i18next";
import { trayAction, type TrayAction } from "../api/ipc/modules/tray";
import type { CSSProperties } from "react";
import "./TrayMenu.css";

/**
 * 托盘菜单动作，必须与 commands/tray.rs 中 Rust `TrayAction`
 * 枚举（`#[serde(rename_all = "snake_case")]`）保持一致。
 * Tray menu actions. They must match the Rust `TrayAction` enum
 * (`#[serde(rename_all = "snake_case")]`) in commands/tray.rs.
 */
export default function TrayMenu() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  async function handleAction(action: TrayAction) {
    try {
      await trayAction(action);
    } catch (e) {
      console.error("[TrayMenu] tray_action failed:", e);
    }
  }
  const rootStyle = {
    "--tray-hover-bg": token.colorFillTertiary,
    "--tray-danger-color": token.colorError,
    "--tray-danger-bg": token.colorErrorBg,
    "--tray-divider-color": token.colorBorderSecondary,
    background: token.colorBgElevated,
    color: token.colorText,
    fontFamily: token.fontFamily,
  } as CSSProperties;
  return (
    <div className="tray-menu" style={rootStyle}>
      <div className="tray-menu-item" onClick={() => void handleAction("show")}>
        {t("tray.show")}
      </div>
      <div className="tray-menu-item" onClick={() => void handleAction("hide")}>
        {t("tray.hide")}
      </div>
      <div className="tray-menu-divider" />
      <div className="tray-menu-item" onClick={() => void handleAction("settings")}>
        {t("common.settings")}
      </div>
      <div className="tray-menu-item" onClick={() => void handleAction("check_update")}>
        {t("tray.checkUpdate")}
      </div>
      <div className="tray-menu-divider" />
      <div
        className="tray-menu-item tray-menu-item-danger"
        onClick={() => void handleAction("quit")}
      >
        {t("tray.quit")}
      </div>
    </div>
  );
}
