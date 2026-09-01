use crate::error::{AppError, AppResult};
use crate::state::SharedState;
use serde::Serialize;

#[derive(Serialize, sqlx::FromRow)]
pub struct Note {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub async fn list_notes(state: tauri::State<'_, SharedState>) -> AppResult<Vec<Note>> {
    sqlx::query_as::<_, Note>(
        "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY id DESC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))
}

#[tauri::command]
pub async fn create_note(
    state: tauri::State<'_, SharedState>,
    title: String,
    content: String,
) -> AppResult<Note> {
    if title.trim().is_empty() {
        return Err(AppError::InvalidInput("title is empty".into()));
    }
    let result = sqlx::query("INSERT INTO notes (title, content) VALUES (?, ?)")
        .bind(&title)
        .bind(&content)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let id = result.last_insert_rowid();
    sqlx::query_as::<_, Note>(
        "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))
}

#[tauri::command]
pub async fn update_note(
    state: tauri::State<'_, SharedState>,
    id: i64,
    title: String,
    content: String,
) -> AppResult<Note> {
    let result = sqlx::query(
        "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(&title)
    .bind(&content)
    .bind(id)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("note {id}")));
    }
    sqlx::query_as::<_, Note>(
        "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))
}

#[tauri::command]
pub async fn delete_note(state: tauri::State<'_, SharedState>, id: i64) -> AppResult<()> {
    let result = sqlx::query("DELETE FROM notes WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("note {id}")));
    }
    Ok(())
}
