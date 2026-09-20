# 环境变量

项目用根目录的同一组 `.env*` 文件同时驱动 Vite 前端和 Rust 后端。模式由 `APP_ENV` 统一控制：

- `development`
- `test`
- `production`

## 文件与优先级

提交到仓库的基础文件：

| 文件 | 用途 |
| --- | --- |
| `.env` | 所有模式共享 |
| `.env.development` | development 模式 |
| `.env.test` | test 模式 |
| `.env.production` | production 模式 |

本地覆盖文件不提交，适合临时改值：

| 文件 | 用途 |
| --- | --- |
| `.env.local` | 所有模式本地覆盖 |
| `.env.development.local` | development 本地覆盖 |
| `.env.test.local` | test 本地覆盖 |
| `.env.production.local` | production 本地覆盖 |

加载优先级从高到低：

```text
1. process environment variables
2. .env.<mode>.local
3. .env.local
4. .env.<mode>
5. .env
```

Vite 按自己的多模式机制读取这些文件；Rust 端由 `src-tauri/build.rs` 用 `dotenvy` 按同一顺序读取，并把所有变量通过 `cargo:rustc-env` 注入编译期。因此这里没有 Rust 端变量白名单，只有前缀决定了谁能读取。

## 前端与 Rust 的变量约定

| 前缀 | 使用方 | 说明 |
| --- | --- | --- |
| `APP_PUBLIC_*` | 前端 + Rust | `vite.config.ts` 中配置 `envPrefix: ["APP_PUBLIC_"]`，才会暴露给 `import.meta.env` |
| `APP_SERVER_*` | 仅 Rust | Vite 不暴露；`build.rs` 会注入给 Rust |
| `APP_ENV` | 脚本 + Rust 构建期 | 当前模式，由包装脚本设置，前端如需读取请使用 `APP_PUBLIC_ENV` |

示例：

```dotenv
APP_PUBLIC_APP_TITLE=tauri-zero
APP_PUBLIC_API_BASE_URL=https://api.example.com
APP_SERVER_DB_FILENAME=tauri-zero.db
APP_SERVER_DB_POOL_SIZE=5
APP_SERVER_DEFAULT_CLOSE_TO_TRAY=true
```

不要把密钥放进 `.env`、`.env.<mode>` 或提交到 Git。真正的密钥（例如自动更新签名私钥）应使用 CI secrets 或本机进程环境变量；本地覆盖文件也只用于临时值。

## 前端类型化

`src/vite-env.d.ts` 声明了 `ImportMetaEnv`。新增 `APP_PUBLIC_*` 变量时同步补充类型：

```ts
interface ImportMetaEnv {
  readonly APP_PUBLIC_APP_TITLE: string;
  readonly APP_PUBLIC_ENV: "development" | "test" | "production";
  readonly APP_PUBLIC_API_BASE_URL: string;
}
```

使用示例：

```ts
const baseURL = import.meta.env.APP_PUBLIC_API_BASE_URL;
```

Vite 会在构建时静态替换 `import.meta.env.*`。没有 `APP_PUBLIC_` 前缀的变量不会进入前端产物。

## Rust 编译期注入

`src-tauri/build.rs` 做三件事：

1. 读取 `APP_ENV`，或根据 Cargo `PROFILE` 推断模式（release 默认 production，debug 默认 development）；
2. 按上表优先级读取根目录 `.env*` 文件；
3. 把所有变量输出为 `cargo:rustc-env=KEY=value`。

业务代码在真实使用点通过 `option_env!` 读取：

```rust
// src-tauri/src/db.rs
pub fn db_filename() -> &'static str {
    option_env!("APP_SERVER_DB_FILENAME").unwrap_or("tauri-zero.db")
}

pub fn db_max_connections() -> u32 {
    option_env!("APP_SERVER_DB_POOL_SIZE")
        .unwrap_or("5")
        .parse()
        .expect("APP_SERVER_DB_POOL_SIZE must be a positive integer")
}
```

默认关闭到托盘行为在 `src-tauri/src/state/mod.rs` 就近读取：

```rust
fn default_close_to_tray() -> bool {
    option_env!("APP_SERVER_DEFAULT_CLOSE_TO_TRAY")
        .unwrap_or("true")
        .parse()
        .expect("APP_SERVER_DEFAULT_CLOSE_TO_TRAY must be a boolean")
}
```

这些值是编译期确定的。打包后的应用不要求目标机器存在 `.env` 文件；不同模式需要重新执行对应的 build 命令。

## 命令矩阵

| 命令 | `APP_ENV` | Vite mode | Tauri 动作 |
| --- | --- | --- | --- |
| `pnpm tauri:dev` | development | development | 启动开发会话 |
| `pnpm tauri:test` | test | test | 以 test 配置启动开发会话 |
| `pnpm tauri:prod` | production | production | 以 production 配置启动开发会话 |
| `pnpm tauri:build` | production | production | 打包 |
| `pnpm tauri:build:dev` | development | development | 以 development 配置打包 |
| `pnpm tauri:build:test` | test | test | 以 test 配置打包 |
| `pnpm rust:test` | test | 不适用 | Cargo 测试 |

单独运行前端时：

```bash
pnpm dev          # development
pnpm dev:test     # test
pnpm build        # production
pnpm build:test   # test
pnpm build:prod   # production
```

注意命名语义：`pnpm tauri:test` 是“用 test 环境启动桌面应用”，不是执行测试。执行 Rust 测试请使用 `pnpm rust:test`，它会强制设置 `APP_ENV=test`，让测试读取 `.env.test`。

## 构建缓存

`build.rs` 对所有候选 `.env*` 文件输出 `cargo:rerun-if-changed`，新增或修改这些文件会触发 Rust 重新编译。环境变量是启动 / 构建时读取，不提供运行时热更新；修改后需要重新启动 dev 会话或重新打包。