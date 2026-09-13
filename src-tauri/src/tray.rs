use tauri::{
    tray::{MouseButton, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, Wry,
};

pub const TRAY_ID: &str = "main-tray";

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
    match event {
        TrayIconEvent::Click {
            button: MouseButton::Left,
            ..
        } => {
            // Left click: toggle main window visibility
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        TrayIconEvent::Click {
            button: MouseButton::Right,
            position,
            ..
        } => {
            // Right click: show custom popup window at cursor position
            if let Some(popup) = app.get_webview_window("tray-popup") {
                let pos = compute_popup_position(app, position, &popup);
                let _ = popup.set_position(pos);
                let _ = popup.show();
                let _ = popup.set_focus();
            }
        }
        _ => {}
    }
}

/// Compute popup window position, adjusting for screen boundaries.
fn compute_popup_position(
    app: &AppHandle<Wry>,
    cursor: PhysicalPosition<f64>,
    popup: &tauri::WebviewWindow<Wry>,
) -> PhysicalPosition<i32> {
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

        // Don't go off the right edge
        if x + popup_size.width as i32 > screen_right {
            x = screen_right - popup_size.width as i32;
        }
        // If popup would go below the screen, show it above the cursor
        if y + popup_size.height as i32 > screen_bottom {
            y = cursor.y as i32 - popup_size.height as i32;
        }
    }

    PhysicalPosition::new(x, y)
}
