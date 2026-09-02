# 使用指南

tauri-zero 是一个开箱即用的 Tauri 2 + React 19 脚手架。本指南按功能模块介绍如何使用，帮助你快速上手并扩展业务。

## 目录

- [快速开始](./quick-start.md)
- [前端开发](./frontend.md) — 路由、状态管理、请求层、国际化、通用组件
- [Rust 端开发](./rust.md) — 命令、错误处理、全局状态、SQLite 持久化
- [系统能力](./plugins.md) — 文件系统、对话框、通知、剪贴板、Shell、自动更新
- [环境变量](./env.md) — 多环境配置与类型化 `import.meta.env`
- [测试](./testing.md) — 前端 Vitest 与 Rust 测试
- [CI/CD 与发布](./ci-cd.md) — 质量门禁、自动发版、自动更新分发

## 目录结构速览

```
src/                 # 前端源码
  api/               # 请求封装与接口定义
  components/        # 通用组件
  hooks/             # 自定义 hooks
  layouts/           # 布局
  locales/           # i18n 文案
  pages/             # 路由页面
  router/            # 路由配置
  stores/            # zustand 状态
  utils/             # 工具函数
src-tauri/           # Rust 端
  src/commands/      # Tauri 命令（按业务域拆分）
  src/db.rs          # sqlx + SQLite 连接池
  src/error.rs       # 统一错误类型
  src/state.rs       # 全局状态
  capabilities/      # 权限声明
```

## 约定

- 前端请求统一走 `src/api/request.ts` 的 `request<T>()`，不要直接 `fetch`。
- Rust 命令统一返回 `AppResult<T>`，错误通过 `AppError` 序列化给前端。
- 新增页面在 `src/pages/` 下创建，并在 `src/router/createAppRouter.tsx` 注册。
- 新增 Rust 命令在 `src-tauri/src/commands/` 下按业务域建模块，并在 `lib.rs` 的 `invoke_handler` 注册。