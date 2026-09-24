use serde::Serialize;

/// 领域模型，对应数据库 notes 表的一行；同时实现 Serialize（IPC 返回）与 sqlx::FromRow（查询映射）。
/// Domain model representing one row in the notes table; also implements Serialize for IPC responses and sqlx::FromRow for query mapping.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Note {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[cfg(test)]
mod tests {
    use super::Note;

    #[test]
    fn note_is_serializable() {
        let note = Note {
            id: 1,
            title: "test".into(),
            content: "content".into(),
            created_at: "2026-01-01 00:00:00".into(),
            updated_at: "2026-01-01 00:00:00".into(),
        };
        let json = serde_json::to_value(&note).unwrap();
        assert_eq!(json["id"], 1);
        assert_eq!(json["title"], "test");
    }
}
