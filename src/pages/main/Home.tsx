import { Button, Card, Input, Space, Typography } from "antd";
import { Link } from "react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WindowList from "./WindowList";
import { useWindowStore } from "../../stores/useWindowStore";

export default function Home() {
  const { t } = useTranslation();
  const openWindow = useWindowStore((state) => state.open);
  const [documentId, setDocumentId] = useState("demo-document");

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card title={t("common.home")}>
        <Typography.Paragraph>{t("common.welcome")}</Typography.Paragraph>
        <Link to="/settings">
          <Button type="primary">{t("common.openSettings")}</Button>
        </Link>
      </Card>

      <Card title={t("windows.title")}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space wrap>
            <Button onClick={() => void openWindow({ kind: "settings" }).catch(console.error)}>
              {t("windows.openSettingsWindow")}
            </Button>
            <Input
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
              placeholder={t("windows.documentId")}
              style={{ width: 220 }}
              maxLength={128}
            />
            <Button
              type="primary"
              disabled={!documentId.trim()}
              onClick={() =>
                void openWindow({ kind: "document", contextId: documentId.trim() }).catch(
                  console.error,
                )
              }
            >
              {t("windows.openDocumentWindow")}
            </Button>
          </Space>
          <WindowList />
        </Space>
      </Card>
    </Space>
  );
}
