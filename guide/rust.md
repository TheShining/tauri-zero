# Rust 端开发

## 命令模块化

Tauri 命令按业务域拆分在 `src-tauri/src/commands/`，通过 `mod.rs` 导出，并在 `lib.rs` 的 `invoke_handler` 注册。

```rust
// src-tauri/src/commands/greet.rs
use crate::error::{AppError, AppResult};

#[tauri::command]
pub fn greet(name: &str) -> AppResult<String> {
    if name.is_empty() {
        return Err(AppError::InvalidInput("name is empty".into()));
    }
    Ok(format!("Hello, {name}!"))
}
```

### 新增命令

1. 在 `src-tauri/src/commands/` 下新建模块（如 `user.rs`）。
2. 在 `mod.rs` 中 `pub mod user;`。
3. 在 `lib.rs` 的 `invoke_handler` 中注册 `commands::user::xxx`。
4. 前端在 `src/api/modules/` 中封装 `invoke` 调用。

## 统一错误处理

错误类型定义在 `src-tauri/src/error.rs`，使用 `thiserror` 派生，并实现 `Serialize` 以便序列化给前端。

```rust
pub enum AppError {
    NotFound(String),
    InvalidInput(String),
    Internal(String),
}

pub type AppResult<T> = Result<T, AppError>;
```

前端 `invoke` 失败时会收到结构化错误对象 `{ kind, code, message }`。

## 全局状态

全局状态定义在 `src-tauri/src/state.rs`，通过 `tauri::State` 注入命令。

```rust
pub struct AppState {
    pub counter: RwLock<i64>,
    pub db: SqlitePool,
}
```

在命令中访问：

```rust
#[tauri::command]
pub async fn increment_counter(state: tauri::State<'_, SharedState>) -> AppResult<i64> {
    let mut counter = state.counter.write().await;
    *counter += 1;
    Ok(*counter)
}
```

## SQLite 持久化

使用 `sqlx` + SQLite，连接池在 `src-tauri/src/db.rs` 初始化，数据库文件位于应用数据目录（`app_data_dir/tauri-zero.db`）。

示例命令见 `src-tauri/src/commands/note.rs`，提供 `list_notes` / `create_note` / `update_note` / `delete_note`。

### 新增表

在 `db.rs` 的 `init_pool` 中追加 `CREATE TABLE IF NOT EXISTS ...`，或使用 sqlx 迁移（migrations）。

## 日志

使用 `tauri-plugin-log`，输出到 stdout 与日志文件（`LogDir/tauri-zero.log`）。

```rust
log::info!("something happened");
log::error!("failed: {}", e);
```

前端可通过 `@tauri-apps/plugin-log` 读取日志（如需要可自行封装命令）。