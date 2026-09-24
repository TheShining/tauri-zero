pub mod app;
pub mod greet;

/// 生成统一的 invoke_handler，包含所有命令；在 lib.rs 中使用
/// `.invoke_handler(crate::all_handlers!())`。新增命令模块时，在对应分组下追加路径即可，lib.rs 无需改动。
///
/// Generate a unified invoke_handler containing all commands; use
/// `.invoke_handler(crate::all_handlers!())` in lib.rs. When adding a command module, append its path under the matching group so lib.rs requires no changes.
#[macro_export]
macro_rules! all_handlers {
    () => {
        tauri::generate_handler![
            // --- 演示命令 ---
            // --- demo ---
            commands::greet::greet,
            commands::app::increment_counter,
            // --- notes 领域命令 ---
            // --- domain::note ---
            domain::note::command::list_notes,
            domain::note::command::create_note,
            domain::note::command::update_note,
            domain::note::command::delete_note,
            // --- 文件系统命令 ---
            // --- platform::fs ---
            platform::fs::read_text_file,
            platform::fs::write_text_file,
            platform::fs::file_exists,
            // --- 窗口命令 ---
            // --- platform::window ---
            platform::window::window_open,
            platform::window::window_list,
            platform::window::window_focus,
            platform::window::window_hide,
            platform::window::window_close,
            platform::window::window_force_close,
            platform::window::window_set_dirty,
            // --- 托盘命令 ---
            // --- platform::tray ---
            platform::tray::set_close_to_tray,
            platform::tray::tray_action,
        ]
    };
}
