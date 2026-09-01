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
        };
        let mut state = serializer.serialize_struct("AppError", 3)?;
        state.serialize_field("kind", kind)?;
        state.serialize_field("code", code)?;
        state.serialize_field("message", message)?;
        state.end()
    }
}

pub type AppResult<T> = Result<T, AppError>;

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
}
