# 测试

## 前端测试

使用 Vitest + jsdom。示例见 `src/router/index.test.ts`。

```bash
pnpm test
```

### 新增测试

在目标文件旁创建 `*.test.ts` / `*.test.tsx`，使用 `@testing-library/react` 渲染组件。

## Rust 测试

```bash
pnpm rust:test
```

示例见 `src-tauri/src/error.rs` 的 `#[cfg(test)]` 模块。

## 质量门禁

提交前会自动运行 lint-staged；CI 会执行 `lint` → `typecheck` → `test` → `rust:check` → `rust:clippy` → `rust:test`。