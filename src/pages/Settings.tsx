import { Card, ColorPicker, Typography } from "antd";
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
        <ColorPicker
          value={primaryColor}
          onChange={(color) => setPrimaryColor(color.toHexString())}
          showText
        />
      </div>
    </Card>
  );
}
