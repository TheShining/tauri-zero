pub mod app;
pub mod greet;

/// 生成统一的 invoke_handler，包含所有命令。
/// 用法（在 lib.rs 中）：
///   .invoke_handler(crate::all_handlers!())
///
/// 新增命令模块时，在对应分组下追加路径即可，lib.rs 无需改动。
#[macro_export]
macro_rules! all_handlers {
    () => {
        tauri::generate_handler![
            // --- demo ---
            commands::greet::greet,
            commands::app::increment_counter,
            // --- domain::note ---
            domain::note::command::list_notes,
            domain::note::command::create_note,
            domain::note::command::update_note,
            domain::note::command::delete_note,
            // --- platform::fs ---
            platform::fs::read_text_file,
            platform::fs::write_text_file,
            platform::fs::file_exists,
            // --- platform::window ---
            platform::window::window_open,
            platform::window::window_list,
            platform::window::window_focus,
            platform::window::window_hide,
            platform::window::window_close,
            platform::window::window_force_close,
            platform::window::window_set_dirty,
            // --- platform::tray ---
            platform::tray::set_close_to_tray,
            platform::tray::tray_action,
        ]
    };
}
