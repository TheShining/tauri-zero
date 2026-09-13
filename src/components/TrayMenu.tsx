import { theme } from "antd";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import type { CSSProperties } from "react";
import "./TrayMenu.css";

/**
 * Tray menu actions.  Must match the Rust `TrayAction` enum
 * (`#[serde(rename_all = "snake_case")]`) in commands/tray.rs.
 */
export type TrayActionType = "show" | "hide" | "settings" | "check_update" | "quit";

export default function TrayMenu() {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  async function handleAction(action: TrayActionType) {
    try {
      await invoke("tray_action", { action });
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
