# 快速开始

## 环境要求

- Node >= 20
- pnpm >= 9
- Rust stable（edition 2021）

## 安装与运行

```bash
git clone https://github.com/TheShining/tauri-zero.git
cd tauri-zero
pnpm install
pnpm tauri dev
```

## 常用脚本

| 脚本 | 说明 |
| --- | --- |
| `pnpm dev` | 启动 Vite 开发服务器 |
| `pnpm tauri dev` | 启动 Tauri 桌面应用 |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | Vitest 单元测试 |
| `pnpm rust:check` | cargo check |
| `pnpm rust:clippy` | cargo clippy（-D warnings） |
| `pnpm rust:test` | cargo test |
| `pnpm build` | 前端构建 |
| `pnpm tauri build` | Tauri 打包 |

## 打包

```bash
pnpm tauri build
```

产物位于 `src-tauri/target/release/bundle/`。