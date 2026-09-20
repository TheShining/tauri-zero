# 快速开始

## 环境要求

- Node >= 22
- pnpm >= 9
- Rust stable（edition 2021）

## 安装与运行

```bash
git clone https://github.com/TheShining/tauri-zero.git
cd tauri-zero
pnpm install
pnpm tauri:dev
```

## 常用脚本

| 脚本 | 说明 |
| --- | --- |
| `pnpm tauri:dev` | 以 development 配置启动 Tauri 桌面应用 |
| `pnpm tauri:test` | 以 test 配置启动 Tauri 桌面应用 |
| `pnpm tauri:prod` | 以 production 配置启动 Tauri 桌面应用 |
| `pnpm tauri:build` | 以 production 配置打包 |
| `pnpm tauri:build:dev` | 以 development 配置打包 |
| `pnpm tauri:build:test` | 以 test 配置打包 |
| `pnpm dev` | 启动 Vite 开发服务器 |
| `pnpm dev:test` | 以 test mode 启动 Vite |
| `pnpm build` | 前端 production 构建 |
| `pnpm build:test` | 前端 test 构建 |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | Vitest 单元测试 |
| `pnpm rust:check` | cargo check |
| `pnpm rust:clippy` | cargo clippy（`-D warnings`） |
| `pnpm rust:test` | 以 `APP_ENV=test` 执行 cargo test |

> `pnpm tauri:test` 表示使用测试环境配置启动应用，不是运行测试。运行 Rust 测试请使用 `pnpm rust:test`。

## 打包

```bash
pnpm tauri:build
```

如需打出 development 或 test 配置的产物：

```bash
pnpm tauri:build:dev
pnpm tauri:build:test
```

产物位于 `src-tauri/target/release/bundle/`。环境变量在构建时注入，目标机器不需要 `.env` 文件。