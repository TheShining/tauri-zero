import { Tooltip } from "antd";
import { isTauri } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useWindowStore } from "../stores/useWindowStore";
import { SettingsIcon } from "./icons";

// 设置是独立单例窗口：已打开时后端直接聚焦既有窗口，前端无需去重。
// Settings is a standalone singleton window: the backend focuses the existing window
// when it is already open, so the frontend needs no deduplication.
export default function SettingsButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openWindow = useWindowStore((state) => state.open);

  const handleClick = () => {
    // 浏览器开发模式没有窗口管理器，降级为同页跳转顶级 /settings 路由。
    // Browser dev has no window manager; fall back to navigating to the standalone /settings route in place.
    if (!isTauri()) {
      void navigate("/settings");
      return;
    }
    openWindow({ kind: "settings" }).catch((error) => {
      console.error("[SettingsButton] open settings failed:", error);
    });
  };

  return (
    <Tooltip title={t("common.settings")}>
      <button
        type="button"
        className="titlebar__icon-btn"
        aria-label={t("common.settings")}
        onClick={handleClick}
      >
        <SettingsIcon />
      </button>
    </Tooltip>
  );
}
