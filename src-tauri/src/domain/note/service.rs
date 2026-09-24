use super::model::Note;
use super::repo::NoteRepo;
use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;

/// 业务逻辑层，负责参数校验、业务规则和调用 repository；Command 层只做 IPC 参数提取，业务逻辑全部在此。
/// Business-logic layer for parameter validation, business rules, and repository calls; the command layer only extracts IPC parameters, while all business logic lives here.
pub struct NoteService;

impl NoteService {
    pub async fn list(db: &SqlitePool) -> AppResult<Vec<Note>> {
        NoteRepo::list(db).await
    }

    pub async fn create(db: &SqlitePool, title: String, content: String) -> AppResult<Note> {
        if title.trim().is_empty() {
            return Err(AppError::InvalidInput("title is empty".into()));
        }
        NoteRepo::create(db, &title, &content).await
    }

    pub async fn update(
        db: &SqlitePool,
        id: i64,
        title: String,
        content: String,
    ) -> AppResult<Note> {
        if title.trim().is_empty() {
            return Err(AppError::InvalidInput("title is empty".into()));
        }
        NoteRepo::update(db, id, &title, &content).await
    }

    pub async fn delete(db: &SqlitePool, id: i64) -> AppResult<()> {
        NoteRepo::delete(db, id).await
    }
}
