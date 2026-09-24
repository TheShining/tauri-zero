# 前端开发

## 路由

路由使用 `react-router` v8，采用 `createHashRouter`（桌面应用推荐 hash 路由，避免文件协议下 history 路由失效）。

路由定义在 `src/router/createAppRouter.tsx`：

```tsx
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
    // 独立窗口路由：不使用 BasicLayout，在专用无边框窗口中渲染
    { path: "/tray-popup", element: <TrayPopup /> },
    { path: "/documents/:contextId", element: <Document /> },
  ]);
}
```

`src/router/index.tsx` 中的 router 是**模块级单例**（`const router = createAppRouter()`），并随
`Suspense` 一起挂了 `WindowReveal`：真实页面首帧就绪前窗口保持隐藏，消除白屏闪烁。
不要在组件渲染函数体内调用 `createAppRouter()`——上层重渲染时会生成全新 router 实例，
破坏路由内部状态；`createAppRouter()` 保留导出仅用于单元测试按需构造独立实例。

### 新增页面

1. 在 `src/pages/` 下创建页面组件。
2. 在 `createAppRouter.tsx` 中 `lazy` 引入并注册路由。
3. 页面默认懒加载，`Suspense` 已在 `src/router/index.tsx` 中包裹。

## 状态管理

使用 `zustand` v5，统一放在 `src/stores/`。内置两个示例 store：

- `useAppStore`：主题、语言、主题色、关闭到托盘（persist 持久化到 localStorage）；
  主题/语言变更会广播 `app://config-changed` 跨窗口同步；`closeToTray` 同步后端失败时
  会自动回滚开关并通过 `feedback.error` 提示用户
- `useUserStore`：用户信息、token、登出；通过 `partialize` **仅持久化 user 基本信息，
  token 只驻留内存**，应用重启后需重新认证获取

```tsx
import { useAppStore } from "../stores/useAppStore";

const theme = useAppStore((s) => s.theme);
const setTheme = useAppStore((s) => s.setTheme);
```

### 新增 store

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CounterState {
  count: number;
  increment: () => void;
}

export const useCounterStore = create<CounterState>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 })),
    }),
    { name: "counter-store" },
  ),
);
```

## 请求层

网络请求层统一封装在 `src/api/http/`，支持拦截器、超时、错误码、token 注入。

### HTTP 请求

```ts
import { request } from "../api/http/request";

const data = await request<UserInfo>("/user/info", { method: "GET" });
```

`request<T>()` 默认行为：

- 自动拼接 `APP_PUBLIC_API_BASE_URL`
- 自动注入 `Authorization: Bearer <token>`（可通过 `skipAuth: true` 关闭）
- 响应约定 `{ code, message, data }`，`code !== 0` 时抛出 `ApiError`
- 204 无内容响应返回 `undefined`；响应体非 JSON 时抛出 `ApiError`
- 默认错误拦截器先于业务拦截器执行，统一 `feedback.error` 提示；
  需要自行处理错误时传 `skipErrorHandler: true` 跳过默认提示
- 支持 `timeout`、`params`、`body`、`signal` 等配置（调用方 `signal` 与超时信号会合并）

### 自定义拦截器

```ts
import {
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,
} from "../api/http/request";

addRequestInterceptor((config) => {
  // 修改请求配置
  return config;
});

addResponseInterceptor((response) => {
  // 修改响应
  return response;
});

addErrorInterceptor((error) => {
  // 统一错误处理
  console.error(error);
});
```

### 调用 Rust 命令

Rust IPC 命令统一通过 `src/api/ipc/client.ts` 的 `ipcInvoke<T>()` 调用，接口定义在 `src/api/ipc/modules/`。组件和 store 不要直接导入 `invoke`：

```ts
import { listNotes, createNote } from "../api/ipc/modules/note";

const notes = await listNotes();
const note = await createNote("标题", "内容");
```

命令失败时会统一抛出 `AppIpcError`，保留 Rust `AppError` 的 `kind`、`code`、`message`：

```ts
import { isAppIpcError } from "../api/ipc/client";

try {
  await createNote("", "内容");
} catch (error) {
  if (isAppIpcError(error)) {
    console.error(error.kind, error.code, error.message);
  }
}
```

详细分层、错误契约和事件用法见 [前后端通信](./communication.md)。

## 自定义 Hooks

- `useTauriEvent`：订阅全局 Tauri 事件的统一入口（详见 [前后端通信](./communication.md#tauri-事件)）。
- `useConfigSync`：把 `app://config-changed` 广播的 theme/locale 应用到当前 webview 的 zustand 实例。
- `useWindowEvents`：先注册 `window://changed` 监听、再从 `window_list` 水合窗口镜像（有意不用 useTauriEvent，需要顺序保证）。
- `useUpdater`：封装 `plugin-updater` 的 check / downloadAndInstall / relaunch 流程。

## 国际化

使用 `i18next` + `react-i18next`，文案在 `src/locales/`。

```tsx
import { useTranslation } from "react-i18next";

const { t } = useTranslation();
return <span>{t("common.home")}</span>;
```

### 新增文案

1. 在 `src/locales/zh-CN.ts` 和 `en-US.ts` 中同步添加 key。
   `en-US.ts` 以 `typeof zh-CN` 约束，漏加 key 会在编译期报类型错误。
2. 组件内用 `t("key")` 使用；组件里不要写死中英文字符串。

### 切换语言

组件只改 store，`changeLanguage` 由 `src/App.tsx` 的 effect 统一收口并广播跨窗口同步，
不要在组件里直接调用：

```tsx
import { useAppStore } from "../stores/useAppStore";

const setLocale = useAppStore((s) => s.setLocale);

setLocale("en-US");
```

## 通用组件

- `ErrorBoundary`：全局错误边界，捕获渲染错误并展示兜底页（文案走 `i18n.t`）。
- `AppFeedback`：统一消息/通知入口（`feedback.success/error/info/notify`）。
- `TitleBar`：无边框标题栏（拖拽/导航/主题与语言切换）；窗口三键拆在 `WindowControls.tsx`，
  SVG 图标在 `TitleBarIcons.tsx`。
- `ThemeToggle`：明暗主题切换。
- `LocaleSwitch`：中英切换。
- `UpdateChecker`：检查更新 UI；检查入口统一走 `useUpdater` hook。

```tsx
import { feedback } from "../components/AppFeedback";

feedback.success("操作成功");
feedback.error("操作失败");
feedback.notify("info", "提示", "这是一条通知");
```

## UI 组件库

使用 Ant Design v6，主题由 `src/App.tsx` 的 `ConfigProvider` 统一配置（明暗算法 + 主题色 + 语言）。