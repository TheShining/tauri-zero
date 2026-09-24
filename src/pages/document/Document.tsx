import { App as AntdApp, Button, Card, Space, Typography } from "antd";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { APP_EVENTS } from "../../api/ipc/events";
import { useTauriEvent } from "../../hooks/useTauriEvent";
import { useWindowStore } from "../../stores/useWindowStore";
import { documentLabel } from "../../api/ipc/modules/window";
import TitleBar from "../../layouts/titlebar/TitleBar";

export default function Document() {
  const { t } = useTranslation();
  const { modal } = AntdApp.useApp();
  const { contextId = "" } = useParams<{ contextId: string }>();
  const currentLabel = getCurrentWebviewWindow().label;
  const expectedLabel = documentLabel(contextId);
  const isDocumentWindow = currentLabel === expectedLabel;

  const snapshot = useWindowStore((state) =>
    state.windows.find((candidate) => candidate.label === currentLabel),
  );
  const setDirty = useWindowStore((state) => state.setDirty);
  const close = useWindowStore((state) => state.close);
  const forceClose = useWindowStore((state) => state.forceClose);

  // 后端会阻止有未保存内容窗口的关闭，并改为请求当前页面确认；确认事件只定向发送给当前窗口。
  // The backend prevents closing a dirty window and asks this page to confirm instead.
  // The confirm event is targeted at this window only.
  useTauriEvent(APP_EVENTS.windowConfirmClose, () => {
    // 主窗口中手动导航到文档路由并非真文档窗口，直接忽略确认请求。
    // A document route manually opened in the main window is not a real document window;
    // ignore the confirm request there.
    if (!isDocumentWindow) return;
    modal.confirm({
      title: t("document.unsavedTitle"),
      content: t("document.unsavedContent"),
      okText: t("document.discardAndClose"),
      okButtonProps: { danger: true },
      cancelText: t("document.keepEditing"),
      onOk: () => forceClose(currentLabel).catch(console.error),
    });
  });

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
