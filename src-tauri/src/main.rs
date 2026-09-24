// 防止 release 版本在 Windows 打开额外控制台窗口，请勿删除。
// Prevents an additional console window on Windows in release; DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri_zero_lib::run()
}
