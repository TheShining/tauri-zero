mod commands;
mod db;
mod error;
mod state;

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
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("tauri-zero.db");
            let pool = tauri::async_runtime::block_on(db::init_pool(&db_path))
                .map_err(|e| std::io::Error::other(e.to_string()))?;
            app.manage(Arc::new(AppState::new(pool)));
            Ok(())
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
            commands::fs::file_exists
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
