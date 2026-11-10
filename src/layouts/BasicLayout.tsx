import { Outlet, useNavigate } from "react-router";
import { Layout } from "antd";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import TitleBar from "./titlebar/TitleBar";
import { feedback } from "../utils/feedback";
import { APP_EVENTS } from "../api/ipc/events";
import { useTauriEvent } from "../hooks/useTauriEvent";
import { createAndOpenNote } from "../utils/notes";
import { openSettingsWindow } from "../utils/settings";

export default function BasicLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // 让设置窗口自己检查并持有更新资源，检查结果也由更新页统一呈现。
  // Let settings check and own its updater resources; the update page presents the result.
  const handleCheckUpdate = useCallback(async () => {
    try {
      await openSettingsWindow("update");
    } catch (e) {
      feedback.notify("error", t("common.settingsOpenFailed"), String(e));
    }
  }, [t]);

  // 监听托盘弹窗事件（由后端发出）。
  // Listen for events from the tray popup (the backend emits these).
  useTauriEvent(APP_EVENTS.trayCheckUpdate, () => {
    void handleCheckUpdate();
  });
  // 托盘「新建笔记」：后端已把主窗口唤起，这里先回到列表页再复用共用的新建链路。
  // Tray "new note": the backend has already revealed the main window, so navigate back to
  // the list page first, then reuse the shared creation path.
  useTauriEvent(APP_EVENTS.trayNewNote, () => {
    void (async () => {
      try {
        void navigate("/");
        await createAndOpenNote(t("notes.untitled"));
      } catch (error) {
        console.error("[BasicLayout] tray new note failed:", error);
        feedback.error(t("notes.createFailed"));
      }
    })();
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
