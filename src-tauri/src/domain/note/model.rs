use serde::Serialize;

/// 领域模型：对应数据库 notes 表的一行。
/// 同时实现 Serialize（用于 IPC 返回）和 sqlx::FromRow（用于查询映射）。
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
