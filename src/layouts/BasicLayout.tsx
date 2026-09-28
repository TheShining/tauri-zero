import { Outlet, useNavigate } from "react-router";
import { Layout } from "antd";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import TitleBar from "./titlebar/TitleBar";
import { feedback } from "../utils/feedback";
import { APP_EVENTS } from "../api/ipc/events";
import { useTauriEvent } from "../hooks/useTauriEvent";
import { useUpdater } from "../hooks/useUpdater";
import { createAndOpenNote } from "../utils/notes";
import { openSettingsWindow } from "../utils/settings";

export default function BasicLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { checkForUpdates } = useUpdater();

  // 更新检查统一走 useUpdater；托盘触发时顺带通知并打开设置窗口（单例，已开则聚焦）供下载。
  // Update checks go through useUpdater uniformly; the tray-triggered check additionally
  // notifies and opens the settings window (singleton, focused if already open) for downloading.
  const handleCheckUpdate = useCallback(async () => {
    try {
      const update = await checkForUpdates();
      if (update) {
        void openSettingsWindow();
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
  }, [checkForUpdates, t]);

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
