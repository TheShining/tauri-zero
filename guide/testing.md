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

当前 Rust 测试包括：

- `domain/note/repo.rs`：使用内存 SQLite 验证 CRUD 与 not found 场景；
- `domain/note/model.rs`：验证领域模型序列化；
- `error.rs`：验证 `AppError` 序列化格式。

新业务域建议至少覆盖：

1. repository 的 CRUD 与 not found；
2. service 的参数校验与业务规则；
3. error 序列化格式（新增错误类型时）。

## 质量门禁

提交前会自动运行 lint-staged；CI 会执行 `lint` → `typecheck` → `test` → `rust:check` → `rust:clippy` → `rust:test`。
