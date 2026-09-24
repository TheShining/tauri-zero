import { Outlet, useNavigate } from "react-router";
import { Layout } from "antd";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { check } from "@tauri-apps/plugin-updater";
import TitleBar from "../components/TitleBar";
import { feedback } from "../components/AppFeedback";
import { APP_EVENTS } from "../api/ipc/events";
import { useTauriEvent } from "../hooks/useTauriEvent";

export default function BasicLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleCheckUpdate = useCallback(async () => {
    try {
      const update = await check();
      if (update) {
        void navigate("/settings");
        feedback.notify(
          "info",
          t("tray.updateAvailable", { version: update.version }),
          t("tray.updateAvailableDesc"),
        );
      } else {
        feedback.notify("success", t("tray.upToDate"));
      }
    } catch (e) {
      feedback.notify("error", t("tray.updateFailed"), String(e));
    }
  }, [navigate, t]);

  // 监听托盘弹窗事件（由后端发出）。
  // Listen for events from the tray popup (the backend emits these).
  useTauriEvent(APP_EVENTS.trayNavigate, (event) => {
    void navigate(event.payload);
  });
  useTauriEvent(APP_EVENTS.trayCheckUpdate, () => {
    void handleCheckUpdate();
  });

  return (
    <Layout style={{ height: "100vh" }}>
      <TitleBar />
      <Layout.Content style={{ padding: 24, overflow: "auto" }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
