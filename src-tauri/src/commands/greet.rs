use crate::error::{AppError, AppResult};

#[tauri::command]
pub fn greet(name: &str) -> AppResult<String> {
    if name.is_empty() {
        return Err(AppError::InvalidInput("name is empty".into()));
    }
    Ok(format!("Hello, {}! You've been greeted from Rust!", name))
}
