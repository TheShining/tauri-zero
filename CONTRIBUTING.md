# Contributing

## 环境要求

- Node >= 20
- pnpm >= 9
- Rust stable（edition 2021）

## 快速开始

```bash
pnpm install
pnpm dev          # 启动 Vite 开发服务器
pnpm tauri dev    # 启动 Tauri 桌面应用
```

## 常用脚本

| 脚本 | 说明 |
| --- | --- |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | Vitest 单元测试 |
| `pnpm rust:check` | cargo check |
| `pnpm rust:clippy` | cargo clippy（-D warnings） |
| `pnpm rust:test` | cargo test |
| `pnpm build` | 前端构建 |
| `pnpm tauri build` | Tauri 打包 |

## 提交规范

使用 Conventional Commits，提交信息格式：

```
<type>(<scope>): <subject>
```

type 白名单：`feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert`

提交前会自动运行 lint-staged（eslint --fix + prettier --write + rustfmt）。

## Pull Request 流程

1. 从 `main` 拉取最新代码，创建功能分支。
2. 本地通过 `pnpm lint && pnpm typecheck && pnpm test && pnpm rust:check && pnpm rust:clippy && pnpm rust:test`。
3. 提交并推送分支，创建 PR。
4. CI 全绿后请求 review。
