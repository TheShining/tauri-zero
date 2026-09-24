/**
 * 窗口领域常量统一收口：label、路由、label 构造。
 * 窗口 kind（后端 WindowManager 管理）与路由（前端 router 管理）是两套系统，
 * 散落字面量极易在新增窗口类型时漏改，故全部收敛到本文件。
 * Central constants for the window domain: labels, routes, label builders.
 * Window kinds (managed by the backend WindowManager) and routes (managed by the
 * frontend router) are two separate systems; scattering literals makes it easy to
 * miss a spot when adding a window kind, so everything lives here.
 */
export const WINDOW_LABELS = {
  main: "main",
  settings: "settings",
  trayPopup: "tray-popup",
} as const;

/** 构建 document 窗口 label：后端 WindowManager 使用同一规则。 / Build a document window label; the backend WindowManager uses the same rule. */
export const documentLabel = (contextId: string) => `document-${contextId}`;

/** 前端路由路径；document 以函数形式给出，配合 :contextId 动态段。 / Frontend route paths; document is a function matching the :contextId param segment. */
export const ROUTES = {
  home: "/",
  settings: "/settings",
  trayPopup: "/tray-popup",
  document: (contextId: string) => `/documents/${contextId}`,
} as const;
