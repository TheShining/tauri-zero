import { createHashRouter } from "react-router";
import { lazy } from "react";
import BasicLayout from "../layouts/BasicLayout";

const NoteList = lazy(() => import("../pages/notes/NoteList"));
const Settings = lazy(() => import("../pages/settings/Settings"));
const NotFound = lazy(() => import("../pages/shared/NotFound"));
const TrayPopup = lazy(() => import("../pages/tray-popup/TrayPopup"));
const NoteEditor = lazy(() => import("../pages/notes/NoteEditor"));

export function createAppRouter() {
  return createHashRouter([
    {
      path: "/",
      element: <BasicLayout />,
      children: [
        { index: true, element: <NoteList /> },
        { path: "*", element: <NotFound /> },
      ],
    },
    {
      // 托盘弹窗是独立顶级路由（不使用 BasicLayout），渲染在专用无边框 Tauri 窗口中。
      // Tray popup is a standalone top-level route (no BasicLayout) rendered in its own frameless Tauri window.
      path: "/tray-popup",
      element: <TrayPopup />,
    },
    {
      // 设置是独立单例窗口（后端 window.rs 的 Settings spec：单例、可 IPC 关闭），
      // 由标题栏齿轮按钮或托盘菜单打开，不经过 BasicLayout。
      // Settings is a standalone singleton window (the Settings spec in the backend's window.rs:
      // singleton, closable via IPC), opened from the title-bar gear button or the tray menu,
      // and does not go through BasicLayout.
      path: "/settings",
      element: <Settings />,
    },
    {
      // 笔记编辑窗口由 WindowManager 创建，并作为独立顶级窗口渲染；路由后缀与后端 window.rs 的 spec 保持一致。
      // Note editor windows are created by the WindowManager and rendered as standalone top-level
      // windows; the route pattern must stay in sync with the window spec in the backend's window.rs.
      path: "/notes/:contextId",
      element: <NoteEditor />,
    },
  ]);
}
