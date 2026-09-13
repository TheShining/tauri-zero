mod commands;
mod db;
mod error;
mod state;
mod tray;

use state::AppState;
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("tauri-zero".into()),
                    }),
                ])
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("tauri-zero.db");
            let pool = tauri::async_runtime::block_on(db::init_pool(&db_path))
                .map_err(|e| std::io::Error::other(e.to_string()))?;
            app.manage(Arc::new(AppState::new(pool)));

            // Create system tray (custom popup, no native menu)
            tray::create_tray(app.handle()).map_err(|e| std::io::Error::other(e.to_string()))?;

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                let state = window.app_handle().state::<Arc<AppState>>();
                let close_to_tray = *state.close_to_tray.read().unwrap();
                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
            tauri::WindowEvent::Focused(false) if window.label() == "tray-popup" => {
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet::greet,
            commands::app::increment_counter,
            commands::note::list_notes,
            commands::note::create_note,
            commands::note::update_note,
            commands::note::delete_note,
            commands::fs::read_text_file,
            commands::fs::write_text_file,
            commands::fs::file_exists,
            commands::tray::set_close_to_tray,
            commands::tray::tray_action
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
