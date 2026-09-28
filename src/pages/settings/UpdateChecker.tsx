import { Button, Flex, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useUpdater } from "../../hooks/useUpdater";

// 作为设置窗口「更新」分组的行式布局渲染，不再自带 Card 外壳。
// Rendered as rows inside the settings window's "update" group; no longer wrapped in a Card.
export default function UpdateChecker() {
  const { t } = useTranslation();
  const { checking, update, checkForUpdates, downloadAndInstall } = useUpdater();

  return (
    <div className="settings-group">
      <Typography.Text strong className="settings-group-title">
        {t("update.cardTitle")}
      </Typography.Text>
      <div className="settings-row">
        <Flex vertical gap={2} style={{ minWidth: 0 }}>
          <Typography.Text>{t("update.checkUpdate")}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {update ? t("update.newVersion", { version: update.version }) : t("update.checkDesc")}
          </Typography.Text>
        </Flex>
        {update ? (
          <Button type="primary" onClick={() => void downloadAndInstall()}>
            {t("update.downloadInstall")}
          </Button>
        ) : (
          <Button loading={checking} onClick={() => void checkForUpdates()}>
            {t("update.checkUpdate")}
          </Button>
        )}
      </div>
    </div>
  );
}
