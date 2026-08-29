use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Default)]
pub struct AppState {
    pub counter: RwLock<i64>,
}

pub type SharedState = Arc<AppState>;
