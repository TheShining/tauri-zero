import { Card, Switch, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../stores/useAppStore";
import UpdateChecker from "../components/UpdateChecker";

export default function Settings() {
  const { t } = useTranslation();
  const primaryColor = useAppStore((state) => state.primaryColor);
  const setPrimaryColor = useAppStore((state) => state.setPrimaryColor);
  const closeToTray = useAppStore((state) => state.closeToTray);
  const setCloseToTray = useAppStore((state) => state.setCloseToTray);

  return (
    <Card title={t("common.settings")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Typography.Text>{t("common.primaryColor")}</Typography.Text>
        <input
          type="color"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          style={{ width: 48, height: 32, padding: 0, border: "none", cursor: "pointer" }}
        />
      </div>
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <Switch checked={closeToTray} onChange={(checked) => setCloseToTray(checked)} />
        <Typography.Text>{t("common.closeToTray")}</Typography.Text>
      </div>
      <div style={{ marginTop: 16 }}>
        <UpdateChecker />
      </div>
    </Card>
  );
}
