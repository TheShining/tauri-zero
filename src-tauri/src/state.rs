use sqlx::SqlitePool;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AppState {
    pub counter: RwLock<i64>,
    pub db: SqlitePool,
}

impl AppState {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            counter: RwLock::new(0),
            db,
        }
    }
}

pub type SharedState = Arc<AppState>;
