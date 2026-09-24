/**
 * 窗口领域常量统一收口：窗口 label 与 label 构造。
 * 窗口 label 是前后端共享的协议（后端 WindowManager 按相同规则生成），
 * 散落字面量极易在新增窗口类型时漏改，故收敛到本文件；前端路由路径则
 * 由 router 自身定义，不在此处重复。
 * Central constants for the window domain: labels and label builders.
 * Window labels are a protocol shared with the backend (the WindowManager
 * generates them with the same rules); scattering literals makes it easy to
 * miss a spot when adding a window kind, so they live here. Frontend route
 * paths are defined by the router itself and are not duplicated here.
 */
export const WINDOW_LABELS = {
  main: "main",
  settings: "settings",
  trayPopup: "tray-popup",
} as const;

/** 构建 document 窗口 label：后端 WindowManager 使用同一规则。 / Build a document window label; the backend WindowManager uses the same rule. */
export const documentLabel = (contextId: string) => `document-${contextId}`;
