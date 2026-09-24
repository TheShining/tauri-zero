import { Result, Button } from "antd";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle={t("common.notFound")}
      extra={
        <Button type="primary" onClick={() => void navigate("/")}>
          {t("common.backHome")}
        </Button>
      }
    />
  );
}
