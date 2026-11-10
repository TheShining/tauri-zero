# 测试

## 前端测试

使用 Vitest + jsdom。

```bash
pnpm test
```

当前前端测试：

- `src/api/ipc/client.test.ts`：IPC 包装层的返回值透传与错误归一化；
- `src/router/index.test.ts`：路由结构与 hash history；
- `src/stores/useAppStore.test.ts`：`closeToTray` 后端同步失败时的回滚与提示；
- `src/stores/useUserStore.test.ts`：持久化只包含 user、绝不包含 token；
- `src/hooks/useTauriEvent.test.tsx`：事件订阅转发、handler 更新不重订阅、卸载退订；
- `src/hooks/useConfigSync.test.tsx`：config-changed 广播应用到 store，值未变时不触发 setState（回声防护）。
- `src/hooks/useUpdater.test.tsx`：检查/下载/安装失败、无更新、进度、重复操作、dirty 阻止安装及真实设置 UI。
- `src/pages/settings/Settings.test.tsx`：托盘打开更新页、新窗口/已打开窗口接收检查请求、普通设置入口、打开失败清理与浏览器降级。

## 发布脚本测试 / Release script tests

```bash
pnpm test:release
```

`scripts/*.test.mjs` 使用 Node 自带测试运行器，与 `src/` 内的 Vitest 测试分开执行。测试生成内存密钥与小型安装包 fixture，通过真实 Ed25519 验签验证清单，包含错误密钥、篡改包、缺平台、tag/版本不一致、已发布保护、草稿重跑与旧版本保护。密钥脚本测试在临时目录使用 fake CLI，不读取项目私钥或访问 GitHub。

真实发布后的旧版升级、安装器行为和数据保留仍需在各目标平台验收，步骤见 [ci-cd.md](./ci-cd.md)。

### 新增测试

在目标文件旁创建 `*.test.ts` / `*.test.tsx`。项目**未安装** `@testing-library/react`：
纯逻辑直接调用；组件与 hook 用 React 的 `act` + `createRoot` 手动挂载
（参考 `src/hooks/useTauriEvent.test.tsx`，需设置 `IS_REACT_ACT_ENVIRONMENT`），
Tauri API 用 `vi.mock("@tauri-apps/api/...")` 拦截。

## Rust 测试

```bash
pnpm rust:test
```

`scripts/cargo-test.mjs` 会先设置 `APP_ENV=test`，再执行 `cargo test --manifest-path src-tauri/Cargo.toml`。因此 `src-tauri/build.rs` 会读取 `.env.test`，配置相关测试能验证 test 模式的编译期注入结果。

当前 Rust 测试包括：

- `domain/note/repo.rs`：使用内存 SQLite 验证 CRUD 与 not found 场景；
- `domain/note/model.rs`：验证领域模型序列化；
- `error.rs`：验证 `AppError` 序列化格式；
- `db.rs`：验证 test 模式数据库文件名与连接池大小；
- `state/mod.rs`：验证 test 模式默认关闭到托盘配置。

新业务域建议至少覆盖：

1. repository 的 CRUD 与 not found；
2. service 的参数校验与业务规则；
3. error 序列化格式（新增错误类型时）；
4. 新增构建期配置项时，用 `APP_ENV=test` 验证注入值。

## 质量门禁

提交前会自动运行 lint-staged；CI 会执行 `lint` → `typecheck` → `test` → `test:release` → `rust:check` → `rust:clippy` → `rust:test`。
