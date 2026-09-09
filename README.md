# tauri-zero

> 零配置、零样板、零决策的 Tauri 2 + React 19 桌面应用脚手架（starter / boilerplate / template）。clone 即用，你只写业务。
> Zero-config Tauri 2 + React 19 desktop app starter: routing, state, i18n, SQLite, auto-update & CI/CD out of the box.

[![CI](https://github.com/TheShining/tauri-zero/actions/workflows/ci.yml/badge.svg)](https://github.com/TheShining/tauri-zero/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<!-- TODO: 在这里放一张应用截图或 GIF，放在首屏能显著提升 star 转化率 -->
<!-- TODO: add an app screenshot or GIF here to boost conversions -->

## 为什么是 tauri-zero / Why tauri-zero

`create-tauri-app` 给你一个能跑的空白模板；tauri-zero 给你一个能交付的应用骨架。

`create-tauri-app` gives you a blank template that runs; tauri-zero gives you a production-ready app skeleton.

路由、状态、请求、国际化、日志、错误处理、CSP 安全、CI/CD、自动更新——这些"标配"都替你配好了。

Routing, state, requests, i18n, logging, error handling, CSP security, CI/CD, auto-update — all wired up for you.

- **个人开发者 / Indie developers**：5 分钟起一个结构清晰、工程化完备的桌面应用。
- **企业团队 / Teams**：直接获得 lint / format / commit 规范 / 测试 / CI / 自动更新的完整质量门禁。

## 特性 / Features

**前端 / Frontend** — react-router v8 · zustand v5 · plugin-http 请求层 · Ant Design v6 · i18next 中英双语 · ErrorBoundary

**Rust 端 / Backend** — tauri-plugin-log · thiserror 统一错误 · tokio 全局状态 · 命令模块化 · CSP 安全加固

**工程化 / Engineering** — ESLint 10 + Prettier 3 + Stylelint 17 · commitlint + git hooks · 多环境变量 · React Compiler

**持久化与发布 / Persistence & Release** — sqlx + SQLite · 文件系统/对话框/通知/剪贴板/Shell 插件 · 三平台 CI/CD + release-please + 自动更新

## 快速开始 / Quick Start

```bash
git clone https://github.com/TheShining/tauri-zero.git
cd tauri-zero
pnpm install
pnpm tauri dev
```

需要 Node ≥ 22、pnpm ≥ 9、Rust stable。

Requires Node ≥ 22, pnpm ≥ 9, and Rust stable.

## 使用指南 / Guides

完整的功能使用说明见 [guide/](guide/README.md)：路由、状态管理、请求层、国际化、Rust 命令、SQLite 持久化、系统插件、自动更新、环境变量、测试与 CI/CD。

See [guide/](guide/README.md) for full docs: routing, state, requests, i18n, Rust commands, SQLite, plugins, auto-update, env vars, testing & CI/CD.

## 目录结构 / Structure

```
tauri-zero/
├── src/                 # 前端源码（api / components / pages / router / stores / locales）
├── src-tauri/           # Rust 端（commands / capabilities / tauri.conf.json）
├── .github/workflows/   # CI / release 工作流
├── CONTRIBUTING.md
└── LICENSE
```

## 贡献 / Contributing

欢迎贡献，请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

[MIT](LICENSE)
