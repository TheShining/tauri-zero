import { createHashRouter } from "react-router";
import { lazy } from "react";
import BasicLayout from "../layouts/BasicLayout";
import { ROUTES } from "../windows/constants";

const Home = lazy(() => import("../pages/Home"));
const Settings = lazy(() => import("../pages/Settings"));
const NotFound = lazy(() => import("../pages/NotFound"));
const TrayPopup = lazy(() => import("../pages/TrayPopup"));
const Document = lazy(() => import("../pages/Document"));

export function createAppRouter() {
  return createHashRouter([
    {
      path: ROUTES.home,
      element: <BasicLayout />,
      children: [
        { index: true, element: <Home /> },
        { path: "settings", element: <Settings /> },
        { path: "*", element: <NotFound /> },
      ],
    },
    {
      // 托盘弹窗是独立顶级路由（不使用 BasicLayout），渲染在专用无边框 Tauri 窗口中。
      // Tray popup is a standalone top-level route (no BasicLayout) rendered in its own frameless Tauri window.
      path: ROUTES.trayPopup,
      element: <TrayPopup />,
    },
    {
      // 文档窗口由 WindowManager 创建，并作为独立顶级窗口渲染。
      // Document windows are created by WindowManager and render as standalone top-level windows.
      path: "/documents/:contextId",
      element: <Document />,
    },
  ]);
}
