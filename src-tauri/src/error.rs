use serde::ser::{Serialize, SerializeStruct, Serializer};

#[derive(Debug, thiserror::Error)]
#[allow(dead_code)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("internal error: {0}")]
    Internal(String),
    #[error("database error: {0}")]
    Database(String),
    #[error("config error: {0}")]
    Config(String),
    #[error("unauthorized")]
    Unauthorized,
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let (kind, code, message) = match self {
            AppError::NotFound(msg) => ("not_found", "NOT_FOUND", msg.as_str()),
            AppError::InvalidInput(msg) => ("invalid_input", "INVALID_INPUT", msg.as_str()),
            AppError::Internal(msg) => ("internal", "INTERNAL", msg.as_str()),
            AppError::Database(msg) => ("database", "DATABASE", msg.as_str()),
            AppError::Config(msg) => ("config", "CONFIG", msg.as_str()),
            AppError::Unauthorized => ("unauthorized", "UNAUTHORIZED", ""),
        };
        let mut state = serializer.serialize_struct("AppError", 3)?;
        state.serialize_field("kind", kind)?;
        state.serialize_field("code", code)?;
        state.serialize_field("message", message)?;
        state.end()
    }
}

pub type AppResult<T> = Result<T, AppError>;

/// 自动转换 sqlx::Error -> AppError，减少 .map_err() 样板。
/// Automatically converts sqlx::Error into AppError to reduce .map_err() boilerplate.
impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        match e {
            sqlx::Error::RowNotFound => AppError::NotFound("record not found".into()),
            other => AppError::Database(other.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::AppError;

    #[test]
    fn serializes_invalid_input_as_structured_object() {
        let value = serde_json::to_value(AppError::InvalidInput("name is empty".into())).unwrap();

        assert_eq!(value["kind"], "invalid_input");
        assert_eq!(value["code"], "INVALID_INPUT");
        assert_eq!(value["message"], "name is empty");
    }

    #[test]
    fn serializes_database_error() {
        let value = serde_json::to_value(AppError::Database("connection refused".into())).unwrap();
        assert_eq!(value["kind"], "database");
        assert_eq!(value["code"], "DATABASE");
        assert_eq!(value["message"], "connection refused");
    }

    #[test]
    fn serializes_unauthorized_with_empty_message() {
        let value = serde_json::to_value(AppError::Unauthorized).unwrap();
        assert_eq!(value["kind"], "unauthorized");
        assert_eq!(value["code"], "UNAUTHORIZED");
        assert_eq!(value["message"], "");
    }
}
