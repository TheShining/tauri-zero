import { Outlet } from "react-router";
import { Layout } from "antd";

export default function BasicLayout() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header style={{ color: "#fff" }}>{import.meta.env.VITE_APP_TITLE}</Layout.Header>
      <Layout.Content style={{ padding: 24 }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
