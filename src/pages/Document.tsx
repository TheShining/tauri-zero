import { App as AntdApp, Button, Card, Space, Typography } from "antd";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useParams } from "react-router";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { WINDOW_CONFIRM_CLOSE_EVENT } from "../api/ipc/modules/window";
import { useTranslation } from "react-i18next";
import { useWindowStore } from "../stores/useWindowStore";
import TitleBar from "../components/TitleBar";

export default function Document() {
  const { t } = useTranslation();
  const { modal } = AntdApp.useApp();
  const { contextId = "" } = useParams<{ contextId: string }>();
  const currentLabel = getCurrentWebviewWindow().label;
  const expectedLabel = `document-${contextId}`;
  const isDocumentWindow = currentLabel === expectedLabel;

  const snapshot = useWindowStore((state) =>
    state.windows.find((candidate) => candidate.label === currentLabel),
  );
  const setDirty = useWindowStore((state) => state.setDirty);
  const close = useWindowStore((state) => state.close);
  const forceClose = useWindowStore((state) => state.forceClose);

  // The backend prevents closing a dirty window and asks this page to
  // confirm instead. The confirm event is targeted at this window only.
  useEffect(() => {
    if (!isDocumentWindow) {
      return;
    }

    const unlisten = listen<string>(WINDOW_CONFIRM_CLOSE_EVENT, () => {
      modal.confirm({
        title: t("document.unsavedTitle"),
        content: t("document.unsavedContent"),
        okText: t("document.discardAndClose"),
        okButtonProps: { danger: true },
        cancelText: t("document.keepEditing"),
        onOk: () => forceClose(currentLabel).catch(console.error),
      });
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [isDocumentWindow, currentLabel, forceClose, modal, t]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TitleBar />
      <Card title={t("document.title")} style={{ flex: 1, overflow: "auto", borderRadius: 0 }}>
        <Space direction="vertical" size="middle">
          <Typography.Paragraph>
            {t("document.contextId")}: <Typography.Text code>{contextId}</Typography.Text>
          </Typography.Paragraph>

          <Typography.Paragraph type="secondary">
            {isDocumentWindow ? t("document.windowHint") : t("document.mainWindowHint")}
          </Typography.Paragraph>

          {isDocumentWindow ? (
            <Space wrap>
              <Button
                disabled={!snapshot}
                onClick={() => void setDirty(currentLabel, !snapshot?.dirty).catch(console.error)}
              >
                {snapshot?.dirty ? t("document.markClean") : t("document.markDirty")}
              </Button>
              <Button danger onClick={() => void close(currentLabel).catch(console.error)}>
                {t("windows.close")}
              </Button>
            </Space>
          ) : null}
        </Space>
      </Card>
    </div>
  );
}
