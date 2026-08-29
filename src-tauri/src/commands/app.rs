use crate::error::AppResult;
use crate::state::SharedState;

#[tauri::command]
pub async fn increment_counter(state: tauri::State<'_, SharedState>) -> AppResult<i64> {
    let mut counter = state.counter.write().await;
    *counter += 1;
    Ok(*counter)
}
