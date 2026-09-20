use super::model::Note;
use super::service::NoteService;
use crate::error::AppResult;
use crate::state::SharedDbState;

#[tauri::command]
pub async fn list_notes(state: tauri::State<'_, SharedDbState>) -> AppResult<Vec<Note>> {
    NoteService::list(&state.db).await
}

#[tauri::command]
pub async fn create_note(
    state: tauri::State<'_, SharedDbState>,
    title: String,
    content: String,
) -> AppResult<Note> {
    NoteService::create(&state.db, title, content).await
}

#[tauri::command]
pub async fn update_note(
    state: tauri::State<'_, SharedDbState>,
    id: i64,
    title: String,
    content: String,
) -> AppResult<Note> {
    NoteService::update(&state.db, id, title, content).await
}

#[tauri::command]
pub async fn delete_note(state: tauri::State<'_, SharedDbState>, id: i64) -> AppResult<()> {
    NoteService::delete(&state.db, id).await
}
