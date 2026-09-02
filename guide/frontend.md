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
  ]);
}
```

### 新增页面

1. 在 `src/pages/` 下创建页面组件。
2. 在 `createAppRouter.tsx` 中 `lazy` 引入并注册路由。
3. 页面默认懒加载，`Suspense` 已在 `src/router/index.tsx` 中包裹。

## 状态管理

使用 `zustand` v5，统一放在 `src/stores/`。内置两个示例 store：

- `useAppStore`：主题、语言、主题色（persist 持久化到 localStorage）
- `useUserStore`：用户信息、token、登出（persist 持久化）

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

请求层统一封装在 `src/api/`，支持拦截器、超时、错误码、token 注入。

### HTTP 请求

```ts
import { request } from "../api/request";

const data = await request<UserInfo>("/user/info", { method: "GET" });
```

`request<T>()` 默认行为：

- 自动拼接 `VITE_API_BASE_URL`
- 自动注入 `Authorization: Bearer <token>`（可通过 `skipAuth: true` 关闭）
- 响应约定 `{ code, message, data }`，`code !== 0` 时抛出 `ApiError`
- 支持 `timeout`、`params`、`body` 等配置

### 自定义拦截器

```ts
import {
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,
} from "../api/request";

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

Rust 命令通过 `invoke` 调用，接口定义在 `src/api/modules/`：

```ts
import { listNotes, createNote } from "../api/modules/note";

const notes = await listNotes();
const note = await createNote("标题", "内容");
```

## 国际化

使用 `i18next` + `react-i18next`，文案在 `src/locales/`。

```tsx
import { useTranslation } from "react-i18next";

const { t } = useTranslation();
return <span>{t("common.home")}</span>;
```

### 新增文案

1. 在 `src/locales/zh-CN.ts` 和 `en-US.ts` 中同步添加 key。
2. 组件内用 `t("key")` 使用。

### 切换语言

```tsx
import { useAppStore } from "../stores/useAppStore";
import { useTranslation } from "react-i18next";

const { i18n } = useTranslation();
const setLocale = useAppStore((s) => s.setLocale);

setLocale("en-US");
void i18n.changeLanguage("en-US");
```

## 通用组件

- `ErrorBoundary`：全局错误边界，捕获渲染错误并展示兜底页。
- `AppFeedback`：统一消息/通知入口（`feedback.success/error/info/notify`）。
- `ThemeToggle`：明暗主题切换。
- `LocaleSwitch`：中英切换。
- `UpdateChecker`：检查更新 UI。

```tsx
import { feedback } from "../components/AppFeedback";

feedback.success("操作成功");
feedback.error("操作失败");
feedback.notify("info", "提示", "这是一条通知");
```

## UI 组件库

使用 Ant Design v6，主题由 `src/App.tsx` 的 `ConfigProvider` 统一配置（明暗算法 + 主题色 + 语言）。