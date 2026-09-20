use sqlx::SqlitePool;
use std::sync::{Arc, RwLock};
use tokio::sync::RwLock as AsyncRwLock;

/// 数据库状态：所有需要 DB 访问的 command 注入此 state。
pub struct DbState {
    pub db: SqlitePool,
}

impl DbState {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }
}

/// 应用配置状态：托盘行为、窗口偏好等运行时可变配置。
pub struct ConfigState {
    pub close_to_tray: RwLock<bool>,
}

impl ConfigState {
    pub fn new(close_to_tray: bool) -> Self {
        Self {
            close_to_tray: RwLock::new(close_to_tray),
        }
    }
}

/// 示例计数器状态（可后续移除）。
pub struct CounterState {
    pub counter: AsyncRwLock<i64>,
}

impl CounterState {
    pub fn new() -> Self {
        Self {
            counter: AsyncRwLock::new(0),
        }
    }
}

pub type SharedDbState = Arc<DbState>;
pub type SharedConfigState = Arc<ConfigState>;
pub type SharedCounterState = Arc<CounterState>;
