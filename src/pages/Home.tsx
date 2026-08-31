import { Button, Card, Typography } from "antd";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <Card title={t("common.home")}>
      <Typography.Paragraph>{t("common.welcome")}</Typography.Paragraph>
      <Link to="/settings">
        <Button type="primary">{t("common.openSettings")}</Button>
      </Link>
    </Card>
  );
}
