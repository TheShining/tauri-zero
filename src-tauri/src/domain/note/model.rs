use serde::Serialize;

/// 领域模型，对应数据库 notes 表的一行；同时实现 Serialize（IPC 返回）与 sqlx::FromRow（查询映射）。
/// Domain model representing one row in the notes table; also implements Serialize for IPC responses and sqlx::FromRow for query mapping.
// serde 只负责 IPC 序列化（输出 camelCase，与前端 TS 类型风格一致）；
// sqlx::FromRow 直接按 Rust 字段名映射数据库列，两者互不干扰。
// serde only handles IPC serialization (camelCase output, matching the frontend TS style);
// sqlx::FromRow maps database columns by Rust field name, so the two do not interfere.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
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
        // IPC 输出必须是 camelCase：前端与窗口管理模块统一使用 camelCase 字段。
        // IPC output must be camelCase: the frontend and window modules use camelCase fields everywhere.
        assert_eq!(json["createdAt"], "2026-01-01 00:00:00");
        assert_eq!(json["updatedAt"], "2026-01-01 00:00:00");
        assert!(json.get("created_at").is_none());
    }
}
