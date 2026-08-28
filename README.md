# tauri-zero

> 企业级 Tauri 2 + React 19 + Vite 开箱即用脚手架（渐进式建设中）。

## ✨ 更新亮点（P0 工程化基线）

本轮为脚手架奠定团队协作与质量门禁基础，所有检查项均已验证通过（pnpm lint / pnpm typecheck / pnpm format:check 全绿，git hooks 已就位）。

### 代码规范与格式化
- 引入 **ESLint 9** flat config：@eslint/js recommended + 	ypescript-eslint（类型化规则）+ eslint-plugin-react / eact-hooks / eact-refresh
- 接入 **Prettier 3**，并通过 eslint-config-prettier 关闭与 Prettier 冲突的格式化规则
- VS Code 保存即 Prettier 格式化 + ESLint 自动修复（.prettierrc.json 统一缩进 / 换行 / 字符集）

### Git 提交规范
- commitlint（Conventional Commits）约束提交信息：type 白名单 + header ≤ 100
- simple-git-hooks 自动安装 pre-commit（→ lint-staged）与 commit-msg（→ commitlint）
- lint-staged 仅对暂存文件执行 eslint --fix + prettier --write，保证提交质量且不拖慢开发

### Rust 端规范
- 新增 src-tauri/rustfmt.toml、clippy.toml、.cargo/config.toml
- 新增脚本 ust:fmt / ust:fmt:check / ust:clippy（-D warnings）/ ust:check

### 前端目录分层
- 建立 src/{api,components,hooks,layouts,locales,pages,router,stores,styles,types,utils} 分层骨架（含 .gitkeep），为 P1 业务骨架做准备

### 工程化脚本与配置
- package.json 新增 lint / lint:fix / ormat / ormat:check / 	ypecheck / prepare
- engines 约束 Node ≥ 20、pnpm ≥ 9
- pnpm-workspace.yaml 显式放行 esbuild、simple-git-hooks 构建脚本

### 顺手修复
- 修正 src/App.tsx 浮动 Promise（oid greet();）以保持 lint 基线干净
- .gitignore 放行 .vscode/settings.json 入库；所有配置文件统一无 BOM、LF 结尾

## 技术栈

- **桌面框架**: Tauri 2
- **前端**: React 19 + TypeScript 5.8 + Vite 7
- **包管理**: pnpm（workspace 模式）

## 快速开始

> 前置: Node >= 20、pnpm >= 9、Rust toolchain（`rustup`）。

```bash
pnpm install            # 安装前端依赖（含 git hooks）
pnpm tauri dev          # 启动开发
pnpm tauri build        # 打包
```

## 脚本

| 脚本 | 说明 |
| --- | --- |
| `pnpm dev` | 仅启动前端 Vite |
| `pnpm build` | 类型检查 + 前端构建 |
| `pnpm tauri dev` / `pnpm tauri build` | Tauri 开发 / 打包 |
| `pnpm lint` / `pnpm lint:fix` | ESLint 检查 / 自动修复 |
| `pnpm format` / `pnpm format:check` | Prettier 格式化 / 检查 |
| `pnpm typecheck` | `tsc --noEmit` 类型检查 |
| `pnpm rust:fmt` / `pnpm rust:fmt:check` | Rust 格式化 / 检查 |
| `pnpm rust:clippy` | Clippy 检查（`-D warnings`） |
| `pnpm rust:check` | `cargo check` |

## 工程化基线（P0 已落地）

- **代码规范**: ESLint 9 (flat config) + TypeScript-ESA + React 插件 + Prettier 3（`eslint-config-prettier` 关闭冲突规则）
- **编辑器**: VS Code 推荐插件 + 保存即 Prettier 格式化 / ESLint 自动修复
- **Git 提交规范**: `commitlint` (Conventional Commits) + `simple-git-hooks` (pre-commit → `lint-staged`，commit-msg → `commitlint`)
- **暂存区检查**: `lint-staged` 对 `*.{ts,tsx,js,...}` 跑 ESLint --fix + Prettier --write
- **Rust 规范**: `src-tauri/rustfmt.toml` + `clippy.toml` + `.cargo/config.toml`

提交信息须遵循 Conventional Commits：

```
<type>(<scope>): <subject>

type: feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert
```

## 目录结构

```
tauri-zero/
├── src/                 # 前端源码
│   ├── api/             # 接口/请求封装（P1）
│   ├── components/       # 通用组件（P1）
│   ├── hooks/            # 自定义 hooks（P1）
│   ├── layouts/          # 布局（P1）
│   ├── locales/          # 国际化资源（P1）
│   ├── pages/            # 路由页面（P1）
│   ├── router/           # 路由配置（P1）
│   ├── stores/           # 状态管理（P1）
│   ├── styles/           # 全局样式（P1）
│   ├── types/            # 类型定义（P1）
│   └── utils/            # 工具函数（P1）
├── src-tauri/           # Rust 端
│   ├── src/
│   ├── rustfmt.toml
│   ├── clippy.toml
│   └── .cargo/config.toml
├── eslint.config.js
├── .prettierrc.json
├── commitlint.config.js
└── package.json
```

## 路线图

- [x] **P0** 工程化基线（lint / format / commit 规范 / hooks / 目录分层）
- [ ] **P1** 前端骨架（路由 / 状态 / 请求层 / 环境变量 / **Arco Design** UI / i18n / 错误边界）
- [ ] **P1** Rust 骨架（日志 / 错误类型 / AppState / 命令模块化 / 安全加固 CSP）
- [ ] **P2** 持久化（store/sqlite）+ 测试（Vitest）
- [ ] **P3** CI/CD + 自动更新 + 文档完善
- [ ] **P4** 可观测性（错误上报 / 性能监控）

## IDE 设置

安装推荐扩展（VS Code 打开时自动提示）：Tauri、rust-analyzer、ESLint、Prettier。
