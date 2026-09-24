mod commands;
mod db;
mod domain;
mod error;
mod platform;
mod state;
mod utils;

use platform::window::SharedWindowManager;
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
                        // Keep debug builds from competing with an installed
                        // release instance for the same log file.
                        file_name: Some(if cfg!(debug_assertions) {
                            "tauri-zero-dev"
                        } else {
                            "tauri-zero"
                        }
                        .into()),
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
        .plugin(tauri_plugin_os::init())
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

            // 2. 注册应用状态
            let window_manager = Arc::new(platform::window::WindowManager::new());
            app.manage(window_manager);
            app.manage(Arc::new(DbState::new(pool)));
            app.manage(Arc::new(ConfigState::new()));
            app.manage(Arc::new(CounterState::new()));

            // 3. 注册静态窗口并初始化平台模块
            let window_manager = app.state::<SharedWindowManager>();
            window_manager
                .initialize_existing(app.handle())
                .map_err(|e| std::io::Error::other(e.to_string()))?;
            // 主窗口在 tauri.conf.json 静态声明，同样移除 Win11 DWM 的 1px 灰边
            if let Some(main_window) = app.get_webview_window(platform::window::MAIN_WINDOW_LABEL) {
                platform::dwm::polish_borderless_window(&main_window);
            }
            platform::tray::create_tray(app.handle())
                .map_err(|e| std::io::Error::other(e.to_string()))?;
            Ok(())
        })
        .on_window_event(|window, event| {
            let app = window.app_handle();
            let window_manager = app.state::<SharedWindowManager>();
            window_manager.handle_event(app, window, event);
        })
        .invoke_handler(crate::all_handlers!())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
