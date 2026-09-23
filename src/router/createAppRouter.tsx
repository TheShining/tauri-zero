import { createHashRouter } from "react-router";
import { lazy } from "react";
import BasicLayout from "../layouts/BasicLayout";

const Home = lazy(() => import("../pages/Home"));
const Settings = lazy(() => import("../pages/Settings"));
const NotFound = lazy(() => import("../pages/NotFound"));
const TrayPopup = lazy(() => import("../pages/TrayPopup"));
const Document = lazy(() => import("../pages/Document"));

export function createAppRouter() {
  return createHashRouter([
    {
      path: "/",
      element: <BasicLayout />,
      children: [
        { index: true, element: <Home /> },
        { path: "settings", element: <Settings /> },
        { path: "*", element: <NotFound /> },
      ],
    },
    {
      // Tray popup is a standalone top-level route (no BasicLayout)
      // rendered in its own frameless Tauri window.
      path: "/tray-popup",
      element: <TrayPopup />,
    },
    {
      // Document windows are created by WindowManager and render as
      // standalone top-level windows.
      path: "/documents/:contextId",
      element: <Document />,
    },
  ]);
}
