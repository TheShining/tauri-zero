# Rust 端开发

tauri-zero 的 Rust 后端采用「双轨结构」：业务领域代码集中在 `domain/`，平台集成代码集中在 `platform/`。这样后续增加 20+ 业务模块时，不需要把所有东西继续塞进 `commands/`。

## 目录结构

```text
src-tauri/src/
├── commands/          # 注册入口 + demo 命令
│   ├── mod.rs         # all_handlers! 宏
│   ├── app.rs
│   └── greet.rs
├── domain/            # 业务领域，按域内聚
│   └── note/
│       ├── command.rs # IPC 薄层
│       ├── service.rs # 业务规则
│       ├── repo.rs    # SQL 数据访问
│       └── model.rs   # 领域模型
├── platform/          # 平台能力，按能力模块平铺
│   ├── fs.rs
│   └── tray.rs
├── state/             # 拆分后的全局状态
├── db.rs              # SQLite 连接池 + migrations + 数据库配置
└── error.rs           # AppError / AppResult
```

### commands/

`commands/` 不再承载业务逻辑。它保留 demo 命令，并通过 `all_handlers!` 宏统一生成 `invoke_handler`：

```rust
#[macro_export]
macro_rules! all_handlers {
    () => {
        tauri::generate_handler![
            commands::greet::greet,
            commands::app::increment_counter,
            domain::note::command::list_notes,
            platform::fs::read_text_file,
            platform::tray::tray_action,
        ]
    };
}
```

`lib.rs` 中只需：

```rust
.invoke_handler(crate::all_handlers!())
```

新增命令时更新 `commands/mod.rs`，不需要反复修改 `lib.rs`。

## 新增业务域

以 `settings` 为例：

1. 在 `src-tauri/migrations/` 新增一个 SQL 迁移文件；
2. 创建 `src-tauri/src/domain/settings/`；
3. 添加 `model.rs`、`repo.rs`、`service.rs`、`command.rs`；
4. 在 `domain/settings/mod.rs` 声明子模块；
5. 在 `domain/mod.rs` 添加 `pub mod settings;`；
6. 在 `commands/mod.rs` 的 `all_handlers!` 中注册 IPC 命令。

推荐分层：

```text
command.rs  参数提取 + 调用 service
service.rs  校验 + 业务规则
repo.rs     SQL + 模型映射
model.rs    领域模型 / DTO
```

## 新增平台能力

平台集成代码放在 `src-tauri/src/platform/`，例如：

- `fs.rs`：文件系统 IPC 命令
- `tray.rs`：托盘图标、事件和动作命令

平台能力通常是事件驱动、强依赖 Tauri API，因此不强制套用 domain 的四层结构。一个能力对应一个模块即可。

## 统一错误处理

错误类型定义在 `src-tauri/src/error.rs`，使用 `thiserror` 派生，并实现 `Serialize`：

```rust
pub enum AppError {
    NotFound(String),
    InvalidInput(String),
    Internal(String),
    Database(String),
    Config(String),
    Unauthorized,
}

pub type AppResult<T> = Result<T, AppError>;
```

前端 `invoke` 失败时收到：

```json
{
  "kind": "invalid_input",
  "code": "INVALID_INPUT",
  "message": "title is empty"
}
```

## 全局状态

`src-tauri/src/state.rs` 已拆分为 `src-tauri/src/state/mod.rs`，按职责拆分状态：

```rust
pub struct DbState {
    pub db: SqlitePool,
}

pub struct ConfigState {
    pub close_to_tray: RwLock<bool>,
}

impl ConfigState {
    pub fn new() -> Self {
        Self {
            close_to_tray: RwLock::new(default_close_to_tray()),
        }
    }
}

pub struct CounterState {
    pub counter: AsyncRwLock<i64>,
}
```

在 `lib.rs` setup 中分别 `manage()`，命令按需注入对应的 state：

```rust
#[tauri::command]
pub async fn list_notes(state: tauri::State<'_, SharedDbState>) -> AppResult<Vec<Note>> {
    NoteService::list(&state.db).await
}
```

不要把所有状态继续合并回一个 God State。状态膨胀时，优先拆成新的小状态结构。

## SQLite 持久化与迁移

使用 `sqlx` + SQLite：

- 连接池初始化在 `src-tauri/src/db.rs`；
- 数据库文件位于应用数据目录；
- schema 由 `src-tauri/migrations/` 下的 SQL 文件管理；
- 启动时通过 `sqlx::migrate!("./migrations")` 执行迁移。

新增表或字段时：

1. 在 `migrations/` 下新增一个带时间戳前缀的 SQL 文件；
2. 不要手改历史迁移文件；
3. 在对应 domain 的 `model.rs` 和 `repo.rs` 中更新映射与查询。

示例业务域见 `domain/note/`，提供 `list_notes` / `create_note` / `update_note` / `delete_note`。

## 应用配置

项目不设置单独的 `src-tauri/src/config.rs`。构建期环境变量在真实使用点就近读取：

- 数据库名和连接池大小：`src-tauri/src/db.rs`；
- 默认关闭到托盘行为：`src-tauri/src/state/mod.rs`。

后续新增 Rust-only 配置时，优先放入对应业务域或平台模块，而不是恢复一个只有字段转发价值的全局配置对象。若未来出现真正跨多个模块共享、需要校验和组合的复杂配置，再考虑独立配置模块。

## 日志

使用 `tauri-plugin-log`，输出到 stdout 与日志文件：

```rust
log::info!("something happened");
log::error!("failed: {e}");
```
