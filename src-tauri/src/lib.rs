mod commands;
mod error;
mod state;

use state::SharedState;
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
        .manage(SharedState::default())
        .invoke_handler(tauri::generate_handler![
            commands::greet::greet,
            commands::app::increment_counter
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
