# tauri-zero

> 零配置、零样板、零决策的 Tauri 2 + React 19 脚手架。clone 即用，你只写业务。

[![CI](https://github.com/TheShining/tauri-zero/actions/workflows/ci.yml/badge.svg)](https://github.com/TheShining/tauri-zero/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 为什么是 tauri-zero

`create-tauri-app` 给你一个能跑的空白模板；tauri-zero 给你一个能交付的应用骨架。

路由、状态、请求、国际化、日志、错误处理、CSP 安全、CI/CD、自动更新——这些"标配"都替你配好了。

- **个人开发者**：5 分钟起一个结构清晰、工程化完备的桌面应用。
- **企业团队**：直接获得 lint / format / commit 规范 / 测试 / CI / 自动更新的完整质量门禁。

## 特性

**前端** — react-router v8 · zustand v5 · plugin-http 请求层 · Ant Design v6 · i18next 中英双语 · ErrorBoundary

**Rust 端** — tauri-plugin-log · thiserror 统一错误 · tokio 全局状态 · 命令模块化 · CSP 安全加固

**工程化** — ESLint 9 + Prettier 3 + Stylelint 17 · commitlint + git hooks · 多环境变量 · React Compiler

**持久化与发布** — sqlx + SQLite · 文件系统/对话框/通知/剪贴板/Shell 插件 · 三平台 CI/CD + release-please + 自动更新

## 快速开始

```bash
git clone https://github.com/TheShining/tauri-zero.git
cd tauri-zero
pnpm install
pnpm tauri dev
```

需要 Node ≥ 20、pnpm ≥ 9、Rust stable。

## 使用指南

完整的功能使用说明见 [guide/](guide/README.md)：路由、状态管理、请求层、国际化、Rust 命令、SQLite 持久化、系统插件、自动更新、环境变量、测试与 CI/CD。
## 目录结构

```
tauri-zero/
├── src/                 # 前端源码（api / components / pages / router / stores / locales）
├── src-tauri/           # Rust 端（commands / capabilities / tauri.conf.json）
├── .github/workflows/   # CI / release 工作流
├── CONTRIBUTING.md
└── LICENSE
```

## 贡献

欢迎贡献，请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

[MIT](LICENSE)