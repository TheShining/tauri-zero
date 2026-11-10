import { Button, Flex, Progress, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useUpdater } from "../../hooks/useUpdater";

// 作为设置窗口「更新」分组的行式布局渲染，不再自带 Card 外壳。
// Rendered as rows inside the settings window's "update" group; no longer wrapped in a Card.
export default function UpdateChecker() {
  const { t } = useTranslation();
  const { checking, busy, phase, update, progress, error, checkForUpdates, downloadAndInstall } =
    useUpdater();
  const percent =
    progress.total && progress.total > 0
      ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
      : undefined;
  let status = update ? t("update.newVersion", { version: update.version }) : t("update.checkDesc");
  if (phase === "checking") status = t("update.checking");
  if (phase === "current") status = t("update.upToDate");
  if (phase === "blocked") status = t("update.saveBeforeInstall");
  if (phase === "busy") status = t("update.busyElsewhere");
  if (phase === "installing") status = t("update.installing");
  if (phase === "installed") status = t("update.restarting");
  if (phase === "downloading") {
    status = t(
      percent === undefined ? "update.downloadProgressUnknown" : "update.downloadProgress",
      {
        percent,
        downloaded: Math.round(progress.downloaded / 1024),
        total: Math.round((progress.total ?? 0) / 1024),
      },
    );
  }

  return (
    <div className="settings-group">
      <Typography.Text strong className="settings-group-title">
        {t("update.cardTitle")}
      </Typography.Text>
      <div className="settings-row">
        <Flex vertical gap={2} style={{ minWidth: 0 }}>
          <Typography.Text>{t("update.checkUpdate")}</Typography.Text>
          <Typography.Text
            role="status"
            aria-live="polite"
            type="secondary"
            style={{ fontSize: 12 }}
          >
            {status}
          </Typography.Text>
          {phase === "downloading" && percent !== undefined && (
            <Progress percent={percent} size="small" />
          )}
          {error && (
            <Typography.Text role="alert" type="danger" style={{ fontSize: 12 }}>
              {t(`update.${error.stage}Failed`)}: {error.message}
            </Typography.Text>
          )}
        </Flex>
        <Flex gap={8}>
          <Button
            disabled={busy}
            loading={checking}
            onClick={() => void checkForUpdates().catch(() => undefined)}
          >
            {t("update.checkUpdate")}
          </Button>
          {update && (
            <Button
              type="primary"
              disabled={busy}
              loading={busy && !checking}
              onClick={() => void downloadAndInstall()}
            >
              {t(
                error
                  ? "update.retry"
                  : phase === "installed"
                    ? "update.restart"
                    : "update.downloadInstall",
              )}
            </Button>
          )}
        </Flex>
      </div>
    </div>
  );
}
