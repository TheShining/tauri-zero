use crate::error::AppResult;
use crate::state::SharedState;
use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager, Wry};

#[tauri::command]
pub fn set_close_to_tray(value: bool, state: tauri::State<'_, SharedState>) -> AppResult<()> {
    *state.close_to_tray.write().unwrap() = value;
    Ok(())
}

/// Actions invoked from the tray popup menu.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrayAction {
    Show,
    Hide,
    Settings,
    CheckUpdate,
    Quit,
}

/// Handle a tray menu action from the frontend popup.
///
/// All window management is done on the backend to avoid
/// frontend IPC permission issues.
#[tauri::command]
pub fn tray_action(action: TrayAction, app: AppHandle<Wry>) {
    // Hide the popup first — every action closes it.
    if let Some(popup) = app.get_webview_window("tray-popup") {
        let _ = popup.hide();
    }

    match action {
        TrayAction::Show => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        TrayAction::Hide => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        }
        TrayAction::Settings => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = app.emit_to("main", "tray://navigate", "/settings");
            }
        }
        TrayAction::CheckUpdate => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit_to("main", "tray://check-update", ());
        }
        TrayAction::Quit => {
            app.exit(0);
        }
    }
}
