import { Outlet, useNavigate } from "react-router";
import { Layout } from "antd";
import { useTranslation } from "react-i18next";
import { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { check } from "@tauri-apps/plugin-updater";
import TitleBar from "../components/TitleBar";
import { feedback } from "../components/AppFeedback";

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

  // Listen for events from the tray popup (backend emits these).
  // The promise-then-cleanup pattern correctly handles the race where
  // the component unmounts before listen() resolves: .then(fn => fn())
  // defers the unlisten call until the promise settles, no leaks.
  useEffect(() => {
    const unlistenNav = listen<string>("tray://navigate", (event) => {
      void navigate(event.payload);
    });

    const unlistenUpdate = listen("tray://check-update", () => {
      void handleCheckUpdate();
    });

    return () => {
      void unlistenNav.then((fn) => fn());
      void unlistenUpdate.then((fn) => fn());
    };
  }, [navigate, handleCheckUpdate]);

  return (
    <Layout style={{ height: "100vh" }}>
      <TitleBar />
      <Layout.Content style={{ padding: 24, overflow: "auto" }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
