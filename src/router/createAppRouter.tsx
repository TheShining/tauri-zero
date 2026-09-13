import { createHashRouter } from "react-router";
import { lazy } from "react";
import BasicLayout from "../layouts/BasicLayout";

const Home = lazy(() => import("../pages/Home"));
const Settings = lazy(() => import("../pages/Settings"));
const NotFound = lazy(() => import("../pages/NotFound"));
const TrayPopup = lazy(() => import("../pages/TrayPopup"));

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
  ]);
}
