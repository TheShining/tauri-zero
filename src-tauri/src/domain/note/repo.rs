use super::model::Note;
use crate::error::{AppError, AppResult};
use sqlx::SqlitePool;

/// 数据访问层，封装 notes 表的所有 SQL 操作；不包含业务逻辑，只做 CRUD 与模型映射。
/// Data-access layer encapsulating all SQL operations for the notes table; it contains no business logic and only performs CRUD plus model mapping.
pub struct NoteRepo;

impl NoteRepo {
    pub async fn list(pool: &SqlitePool) -> AppResult<Vec<Note>> {
        sqlx::query_as::<_, Note>(
            "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY id DESC",
        )
        .fetch_all(pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn find_by_id(pool: &SqlitePool, id: i64) -> AppResult<Note> {
        sqlx::query_as::<_, Note>(
            "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?",
        )
        .bind(id)
        .fetch_one(pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => AppError::NotFound(format!("note {id}")),
            other => AppError::Database(other.to_string()),
        })
    }

    pub async fn create(pool: &SqlitePool, title: &str, content: &str) -> AppResult<Note> {
        let result = sqlx::query("INSERT INTO notes (title, content) VALUES (?, ?)")
            .bind(title)
            .bind(content)
            .execute(pool)
            .await
            .map_err(AppError::from)?;
        let id = result.last_insert_rowid();
        Self::find_by_id(pool, id).await
    }

    pub async fn update(pool: &SqlitePool, id: i64, title: &str, content: &str) -> AppResult<Note> {
        let result = sqlx::query(
            "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(title)
        .bind(content)
        .bind(id)
        .execute(pool)
        .await
        .map_err(AppError::from)?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!("note {id}")));
        }
        Self::find_by_id(pool, id).await
    }

    pub async fn delete(pool: &SqlitePool, id: i64) -> AppResult<()> {
        let result = sqlx::query("DELETE FROM notes WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await
            .map_err(AppError::from)?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!("note {id}")));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
    use std::str::FromStr;

    async fn setup_pool() -> SqlitePool {
        let options = SqliteConnectOptions::from_str(":memory:")
            .unwrap()
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[tokio::test]
    async fn create_and_find_by_id() {
        let pool = setup_pool().await;
        let note = NoteRepo::create(&pool, "title", "content").await.unwrap();
        assert_eq!(note.title, "title");
        assert_eq!(note.content, "content");

        let found = NoteRepo::find_by_id(&pool, note.id).await.unwrap();
        assert_eq!(found.id, note.id);
    }

    #[tokio::test]
    async fn find_by_id_not_found() {
        let pool = setup_pool().await;
        let result = NoteRepo::find_by_id(&pool, 999).await;
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }

    #[tokio::test]
    async fn list_returns_all_ordered_by_id_desc() {
        let pool = setup_pool().await;
        NoteRepo::create(&pool, "first", "c1").await.unwrap();
        NoteRepo::create(&pool, "second", "c2").await.unwrap();

        let notes = NoteRepo::list(&pool).await.unwrap();
        assert_eq!(notes.len(), 2);
        assert_eq!(notes[0].title, "second"); // id DESC
    }

    #[tokio::test]
    async fn update_changes_title_and_content() {
        let pool = setup_pool().await;
        let note = NoteRepo::create(&pool, "old", "old").await.unwrap();
        let updated = NoteRepo::update(&pool, note.id, "new", "new")
            .await
            .unwrap();
        assert_eq!(updated.title, "new");
        assert_eq!(updated.content, "new");
    }

    #[tokio::test]
    async fn update_not_found() {
        let pool = setup_pool().await;
        let result = NoteRepo::update(&pool, 999, "x", "y").await;
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }

    #[tokio::test]
    async fn delete_removes_record() {
        let pool = setup_pool().await;
        let note = NoteRepo::create(&pool, "temp", "temp").await.unwrap();
        NoteRepo::delete(&pool, note.id).await.unwrap();

        let result = NoteRepo::find_by_id(&pool, note.id).await;
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }

    #[tokio::test]
    async fn delete_not_found() {
        let pool = setup_pool().await;
        let result = NoteRepo::delete(&pool, 999).await;
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }
}
