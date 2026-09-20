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
    pub fn new() -> Self {
        Self {
            close_to_tray: RwLock::new(default_close_to_tray()),
        }
    }
}

/// Default close-to-tray behavior injected by `build.rs` at compile time.
fn default_close_to_tray() -> bool {
    option_env!("APP_SERVER_DEFAULT_CLOSE_TO_TRAY")
        .unwrap_or("true")
        .parse()
        .expect("APP_SERVER_DEFAULT_CLOSE_TO_TRAY must be a boolean")
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

#[cfg(test)]
mod tests {
    use super::ConfigState;

    #[test]
    fn loads_test_close_to_tray_configuration() {
        // `pnpm rust:test` injects APP_ENV=test before invoking Cargo.
        if option_env!("APP_ENV") != Some("test") {
            return;
        }

        let state = ConfigState::new();
        assert!(*state.close_to_tray.read().unwrap());
    }
}
