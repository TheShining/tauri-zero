# 使用指南 / Guides

tauri-zero 是一个开箱即用的 Tauri 2 + React 19 桌面应用脚手架（starter / boilerplate）。本指南按功能模块介绍如何使用，帮助你快速上手并扩展业务。

tauri-zero is a zero-config Tauri 2 + React 19 desktop app starter. These guides walk through each module to help you get started and extend the app.

## 目录 / Contents

- [快速开始](./quick-start.md) — Quick Start
- [前端开发](./frontend.md) — 路由、状态管理、请求层、国际化、通用组件
- [前后端通信](./communication.md) — IPC API 层、Command 契约、错误与事件
- [Rust 端开发](./rust.md) — domain/platform 结构、命令注册、错误处理、状态、SQLite 迁移
- [系统能力](./plugins.md) — 文件系统、对话框、通知、剪贴板、Shell、自动更新
- [系统托盘](./system-tray.md) — 托盘菜单、关闭最小化、主题/语言同步
- [环境变量](./env.md) — 前后端共享多环境配置与类型化 `import.meta.env`
- [测试](./testing.md) — 前端 Vitest 与 Rust 测试
- [CI/CD 与发布](./ci-cd.md) — 质量门禁、自动发版、自动更新分发

## 目录结构速览 / Structure

```text
src/                    # 前端源码
  api/                  # HTTP 请求封装、IPC wrapper 与接口定义
  components/           # 通用组件
  hooks/                # 自定义 hooks
  layouts/              # 布局
  locales/              # i18n 文案
  pages/                # 路由页面
  router/               # 路由配置
  stores/               # zustand 状态
  utils/                # 工具函数

src-tauri/              # Rust 端
  migrations/           # SQLite schema 迁移
  src/commands/         # 命令注册入口 + demo 命令
  src/domain/           # 业务领域（model/repo/service/command）
  src/platform/         # 平台能力（fs/tray 等）
  src/state/            # 按职责拆分的全局状态 + 默认托盘行为配置
  src/db.rs             # SQLite 连接池 + migrations + 数据库配置
  src/error.rs          # 统一错误类型
  capabilities/         # 权限声明
```

## 约定 / Conventions

- 前端外部 HTTP 请求统一走 `src/api/request.ts` 的 `request<T>()`，不要直接 `fetch`。
- 前端 Tauri IPC 调用统一走 `src/api/ipc.ts` 的 `ipcInvoke<T>()` 和 `src/api/modules/`，不要在组件或 store 中直接 `invoke`。
- Rust 命令统一返回 `AppResult<T>`，错误通过 `AppError` 序列化给前端。
- 新增页面在 `src/pages/` 下创建，并在 `src/router/createAppRouter.tsx` 注册。
- 新增业务命令放在 `src-tauri/src/domain/<domain>/command.rs`，并在 `commands/mod.rs` 的 `all_handlers!` 中注册。
- 新增平台命令放在 `src-tauri/src/platform/<capability>.rs`，同样在 `all_handlers!` 中注册。
- 新增表或字段时，在 `src-tauri/migrations/` 中新增 SQL 迁移文件，不要修改历史迁移。
