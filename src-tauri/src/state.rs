use sqlx::SqlitePool;
use std::sync::{Arc, RwLock};
use tokio::sync::RwLock as AsyncRwLock;

pub struct AppState {
    pub counter: AsyncRwLock<i64>,
    pub db: SqlitePool,
    pub close_to_tray: RwLock<bool>,
}

impl AppState {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            counter: AsyncRwLock::new(0),
            db,
            close_to_tray: RwLock::new(true),
        }
    }
}

pub type SharedState = Arc<AppState>;
