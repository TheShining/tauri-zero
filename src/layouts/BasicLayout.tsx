import { Outlet } from "react-router";
import { Link } from "react-router";
import { Layout, Space } from "antd";
import { useTranslation } from "react-i18next";
import LocaleSwitch from "../components/LocaleSwitch";
import ThemeToggle from "../components/ThemeToggle";

export default function BasicLayout() {
  const { t } = useTranslation();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header style={{ color: "#fff", display: "flex", justifyContent: "space-between" }}>
        <Space>
          <Link to="/" style={{ color: "inherit" }}>
            {t("common.home")}
          </Link>
          <Link to="/settings" style={{ color: "inherit" }}>
            {t("common.settings")}
          </Link>
        </Space>
        <Space>
          <ThemeToggle />
          <LocaleSwitch />
        </Space>
      </Layout.Header>
      <Layout.Content style={{ padding: 24 }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
