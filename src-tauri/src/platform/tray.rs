use crate::error::AppResult;
use crate::platform::window::{
    OpenWindowRequest, SharedWindowManager, WindowKind, MAIN_WINDOW_LABEL,
};
use crate::state::SharedConfigState;
use serde::Deserialize;
use tauri::{
    tray::{MouseButton, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, Wry,
};

pub const TRAY_ID: &str = "main-tray";

// ---------------------------------------------------------------------------
// 托盘图标创建与事件处理
// Tray icon creation and event handling
// ---------------------------------------------------------------------------

pub fn create_tray(app: &AppHandle<Wry>) -> tauri::Result<()> {
    let icon = app
        .default_window_icon()
        .cloned()
        .expect("default window icon not found");

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .tooltip("tauri-zero")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(handle_tray_event)
        .build(app)?;

    Ok(())
}

fn handle_tray_event(tray: &TrayIcon<Wry>, event: TrayIconEvent) {
    let app = tray.app_handle();
    let window_manager = app.state::<SharedWindowManager>();

    match event {
        TrayIconEvent::Click {
            button: MouseButton::Left,
            ..
        } => {
            if let Err(error) = window_manager.toggle_main(app) {
                log::error!("[tray] failed to toggle main window: {error}");
            }
        }
        TrayIconEvent::Click {
            button: MouseButton::Right,
            position,
            ..
        } => {
            let position = compute_popup_position(app, position);
            if let Err(error) = window_manager.show_tray_popup_at(app, position) {
                log::error!("[tray] failed to show tray popup: {error}");
            }
        }
        _ => {}
    }
}

/// 计算托盘弹窗位置，并根据屏幕边界调整。
/// Compute the popup window position and adjust for screen boundaries.
fn compute_popup_position(
    app: &AppHandle<Wry>,
    cursor: PhysicalPosition<f64>,
) -> PhysicalPosition<i32> {
    let Some(popup) = app.get_webview_window("tray-popup") else {
        return PhysicalPosition::new(cursor.x as i32, cursor.y as i32);
    };

    let popup_size = popup
        .outer_size()
        .unwrap_or(tauri::PhysicalSize::new(200, 200));
    let mut x = cursor.x as i32;
    let mut y = cursor.y as i32;

    if let Ok(Some(monitor)) = app.primary_monitor() {
        let screen = monitor.size();
        let screen_pos = monitor.position();
        let screen_right = screen_pos.x + screen.width as i32;
        let screen_bottom = screen_pos.y + screen.height as i32;

        if x + popup_size.width as i32 > screen_right {
            x = screen_right - popup_size.width as i32;
        }
        if y + popup_size.height as i32 > screen_bottom {
            y = cursor.y as i32 - popup_size.height as i32;
        }
    }

    PhysicalPosition::new(x, y)
}

// ---------------------------------------------------------------------------
// 托盘相关 IPC 命令
// Tray-related IPC commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn set_close_to_tray(value: bool, state: tauri::State<'_, SharedConfigState>) -> AppResult<()> {
    *state.close_to_tray.write().unwrap() = value;
    Ok(())
}

/// 托盘弹窗菜单触发的动作。
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

#[tauri::command]
pub fn tray_action(
    action: TrayAction,
    app: AppHandle<Wry>,
    state: tauri::State<'_, SharedWindowManager>,
) -> AppResult<()> {
    // 所有菜单动作都会先关闭弹窗；此步骤失败不得阻断动作本身（尤其是 Quit），因此记录日志而不是使用 `?`。
    // Every menu action closes the popup first. A failure here must not block the action itself (especially Quit), so log instead of using `?`.
    if let Err(error) = state.hide_tray_popup(&app) {
        log::warn!("[tray] failed to hide tray popup before action: {error}");
    }

    match action {
        TrayAction::Show => state.focus(&app, MAIN_WINDOW_LABEL)?,
        TrayAction::Hide => state.hide(&app, MAIN_WINDOW_LABEL)?,
        TrayAction::Settings => {
            state.open(
                &app,
                OpenWindowRequest {
                    kind: WindowKind::Settings,
                    context_id: None,
                },
            )?;
        }
        TrayAction::CheckUpdate => {
            state.focus(&app, MAIN_WINDOW_LABEL)?;
            app.emit_to(MAIN_WINDOW_LABEL, "tray://check-update", ())
                .map_err(|error| crate::error::AppError::Internal(format!("{error}")))?;
        }
        TrayAction::Quit => app.exit(0),
    }

    Ok(())
}
