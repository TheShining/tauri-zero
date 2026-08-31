import { Card, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../stores/useAppStore";

export default function Settings() {
  const { t } = useTranslation();
  const primaryColor = useAppStore((state) => state.primaryColor);
  const setPrimaryColor = useAppStore((state) => state.setPrimaryColor);

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
    </Card>
  );
}
