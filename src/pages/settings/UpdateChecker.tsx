import { Button, Card, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useUpdater } from "../../hooks/useUpdater";

export default function UpdateChecker() {
  const { t } = useTranslation();
  const { checking, update, checkForUpdates, downloadAndInstall } = useUpdater();

  return (
    <Card title={t("update.cardTitle")}>
      <Space direction="vertical">
        <Button loading={checking} onClick={() => void checkForUpdates()}>
          {t("update.checkUpdate")}
        </Button>
        {update && (
          <>
            <Typography.Text>{t("update.newVersion", { version: update.version })}</Typography.Text>
            <Button type="primary" onClick={() => void downloadAndInstall()}>
              {t("update.downloadInstall")}
            </Button>
          </>
        )}
      </Space>
    </Card>
  );
}
