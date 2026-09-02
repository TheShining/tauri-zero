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

## 调试（VS Code，F5）

已内置 `.vscode/launch.json` + `tasks.json`，配合 CodeLLDB 实现一键调试。

### 调试 Rust 后端

1. 安装推荐扩展 `vadimcn.vscode-lldb`（VS Code 首次打开会提示）
2. 调试面板选择 **Debug Tauri (Rust)** → 按 `F5`
3. VS Code 先起 Vite（端口 1420），再用 LLDB 启动 debug 二进制（加载 http://localhost:1420）
4. 在 `src-tauri/src/*.rs` 打断点即可命中

### 调试前端（React/TS，WebView 内断点）

Rust 调试通过 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` 开启了 WebView2 调试端口：

1. 先 `F5` 启动 **Debug Tauri (Rust)**，等窗口出现
2. 调试面板选择 **Attach to Tauri WebView (Frontend)** → 运行（最多等待 30s 连上 9222）
3. 在 `src/**/*.tsx` 打断点即可命中

> 也可在运行的应用里右键 → Inspect（或 `F12`）打开 WebView2 DevTools。

## IDE 设置

安装推荐扩展（VS Code 打开时自动提示）：Tauri、rust-analyzer、ESLint、Prettier。

## 包体积分析（Bundle Analysis）

项目内置 `rollup-plugin-visualizer` 作为开发工具，用于分析打包产物体积。

### 使用方法

1. 执行构建：

   ```bash
   pnpm build
   ```

2. 构建完成后，`bundle-analysis/stats.html` 会生成交互式体积树状图（treemap）。

3. 用浏览器打开 `bundle-analysis/stats.html`，即可查看每个模块的压缩前 / gzip / brotli 体积占比，快速定位大依赖。

> 说明：`bundle-analysis/` 已被 `.gitignore` 忽略，分析产物不会提交到仓库。若需临时关闭分析，可移除 `vite.config.ts` 中的 `visualizer` 插件。