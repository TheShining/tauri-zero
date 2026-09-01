use crate::error::{AppError, AppResult};
use std::path::PathBuf;

fn validate_absolute(path: &str) -> AppResult<PathBuf> {
    let path = PathBuf::from(path);
    if !path.is_absolute() {
        return Err(AppError::InvalidInput("path must be absolute".into()));
    }
    Ok(path)
}

#[tauri::command]
pub async fn read_text_file(path: String) -> AppResult<String> {
    let path = validate_absolute(&path)?;
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))
}

#[tauri::command]
pub async fn write_text_file(path: String, content: String) -> AppResult<()> {
    let path = validate_absolute(&path)?;
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
    }
    tokio::fs::write(&path, content)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))
}

#[tauri::command]
pub async fn file_exists(path: String) -> AppResult<bool> {
    let path = validate_absolute(&path)?;
    tokio::fs::try_exists(&path)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))
}
