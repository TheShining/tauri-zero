mod commands;
mod db;
mod domain;
mod error;
mod platform;
mod state;
mod utils;

use state::{ConfigState, CounterState, DbState};
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // --- 基础设施 ---
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
        // --- 系统能力 ---
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        // --- 自动更新 ---
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // 1. 初始化数据库
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join(db::db_filename());
            let pool = tauri::async_runtime::block_on(db::init_pool(
                &db_path,
                db::db_max_connections(),
            ))
            .map_err(|e| std::io::Error::other(e.to_string()))?;
            // 2. 注册 State
            app.manage(Arc::new(DbState::new(pool)));
            app.manage(Arc::new(ConfigState::new()));
            app.manage(Arc::new(CounterState::new()));
            // 3. 平台模块初始化
            platform::tray::create_tray(app.handle())
                .map_err(|e| std::io::Error::other(e.to_string()))?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                let state = window.app_handle().state::<Arc<ConfigState>>();
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
        .invoke_handler(crate::all_handlers!())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
