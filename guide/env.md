# 环境变量

使用 Vite 多环境机制，`VITE_` 前缀变量会注入前端。

| 文件 | 用途 |
| --- | --- |
| `.env` | 所有环境共享 |
| `.env.development` | 开发环境 |
| `.env.test` | 测试环境 |
| `.env.production` | 生产环境 |

## 类型化

`src/vite-env.d.ts` 中声明了 `ImportMetaEnv`，新增变量时同步补充类型：

```ts
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_ENV: "development" | "test" | "production";
  readonly VITE_API_BASE_URL: string;
}
```

## 使用

```ts
const baseURL = import.meta.env.VITE_API_BASE_URL;
```

## 构建指定环境

```bash
pnpm build:test     # 使用 .env.test
pnpm build:prod     # 使用 .env.production
```

> 注意：`VITE_` 变量会在构建时静态注入，运行时无法读取未声明的变量。