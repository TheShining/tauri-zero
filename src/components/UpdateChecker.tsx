import { Button, Card, Space, Typography } from "antd";
import { useUpdater } from "../hooks/useUpdater";

export default function UpdateChecker() {
  const { checking, update, checkForUpdates, downloadAndInstall } = useUpdater();

  return (
    <Card title="Updates">
      <Space direction="vertical">
        <Button loading={checking} onClick={() => void checkForUpdates()}>
          Check for updates
        </Button>
        {update && (
          <>
            <Typography.Text>New version {update.version} available</Typography.Text>
            <Button type="primary" onClick={() => void downloadAndInstall()}>
              Download & Install
            </Button>
          </>
        )}
      </Space>
    </Card>
  );
}
