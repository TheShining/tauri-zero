use crate::error::{AppError, AppResult};
use crate::platform::dwm;
use crate::state::SharedConfigState;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex, RwLock},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    Window, WindowEvent, Wry,
};

pub const WINDOW_CHANGED_EVENT: &str = "window://changed";
pub const WINDOW_CONFIRM_CLOSE_EVENT: &str = "window://confirm-close";
pub const MAIN_WINDOW_LABEL: &str = "main";
pub const TRAY_POPUP_WINDOW_LABEL: &str = "tray-popup";
const SETTINGS_LABEL: &str = "settings";
const DOCUMENT_LABEL_PREFIX: &str = "document-";
const CONTEXT_ID_MAX_LEN: usize = 128;

pub type SharedWindowManager = Arc<WindowManager>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
// The wire format is kebab-case for every variant, consistent with the
// window labels ("tray-popup" comes from tauri.conf.json).
#[serde(rename_all = "kebab-case")]
pub enum WindowKind {
    Main,
    TrayPopup,
    Settings,
    Document,
}

/// Static description of a window kind.
#[derive(Debug, Clone, Copy)]
struct WindowSpec {
    kind: WindowKind,
    /// Fixed label, or the label prefix when `requires_context` is set.
    label: &'static str,
    requires_context: bool,
    /// `None` for windows statically declared in tauri.conf.json (main,
    /// tray-popup): those are only registered here and can never be created
    /// dynamically, so tauri.conf.json remains their single source of truth
    /// for title/size/route.
    creation: Option<WindowCreation>,
}

/// Parameters used when dynamically creating a window.
#[derive(Debug, Clone, Copy)]
struct WindowCreation {
    title: &'static str,
    route: &'static str,
    width: f64,
    height: f64,
    resizable: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenWindowRequest {
    pub kind: WindowKind,
    pub context_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenWindowResult {
    pub label: String,
    pub created: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowSnapshot {
    pub label: String,
    pub kind: WindowKind,
    pub context_id: Option<String>,
    pub visible: bool,
    pub focused: bool,
    pub dirty: bool,
}

#[derive(Debug, Clone)]
struct WindowInstance {
    label: String,
    kind: WindowKind,
    context_id: Option<String>,
    visible: bool,
    focused: bool,
    dirty: bool,
    created_at: u64,
    last_focused_at: u64,
}

impl WindowInstance {
    fn new(
        label: String,
        kind: WindowKind,
        context_id: Option<String>,
        visible: bool,
        focused: bool,
    ) -> Self {
        let now = unix_timestamp();
        Self {
            label,
            kind,
            context_id,
            visible,
            focused,
            dirty: false,
            created_at: now,
            last_focused_at: if focused { now } else { 0 },
        }
    }

    fn snapshot(&self) -> WindowSnapshot {
        WindowSnapshot {
            label: self.label.clone(),
            kind: self.kind,
            context_id: self.context_id.clone(),
            visible: self.visible,
            focused: self.focused,
            dirty: self.dirty,
        }
    }
}

#[derive(Default)]
pub struct WindowManager {
    /// Lock ordering: `creation_lock` may be held while acquiring `windows`,
    /// never the other way around. Window creation blocks on the main event
    /// loop, which can itself handle events that need `windows`; reversing
    /// this order can deadlock.
    windows: RwLock<HashMap<String, WindowInstance>>,
    creation_lock: Mutex<()>,
}

impl WindowManager {
    pub fn new() -> Self {
        Self::default()
    }

    /// Register windows that were statically created from tauri.conf.json.
    pub fn initialize_existing(&self, app: &AppHandle<Wry>) -> AppResult<()> {
        for kind in [WindowKind::Main, WindowKind::TrayPopup] {
            let spec = window_spec(kind);
            if let Some(window) = app.get_webview_window(spec.label) {
                self.register_existing_window(&window, spec, None)?;
            }
        }

        self.broadcast(app)?;
        Ok(())
    }

    pub fn open(
        &self,
        app: &AppHandle<Wry>,
        request: OpenWindowRequest,
    ) -> AppResult<OpenWindowResult> {
        let spec = window_spec(request.kind);
        let context_id = normalize_context_id(spec, request.context_id)?;
        let label = derive_label(spec, context_id.as_deref())?;

        // Serialize the check-then-create critical section. This prevents
        // duplicate windows when the same command is invoked twice quickly.
        // Broadcasting happens after the guard is released.
        let created = {
            let _guard = self
                .creation_lock
                .lock()
                .map_err(|_| AppError::Internal("window creation lock poisoned".into()))?;

            match app.get_webview_window(&label) {
                Some(window) => {
                    // Self-heal: the webview lives in Tauri but is missing
                    // from the registry (e.g. a lifecycle event race).
                    // Re-register instead of erroring out on focus.
                    if self.registered_kind(&label).is_err() {
                        self.register_existing_window(&window, spec, context_id)?;
                    }
                    false
                }
                None => {
                    let creation = creation_params(spec)?;
                    let route =
                        build_route(creation, spec.requires_context, context_id.as_deref())?;
                    let window = WebviewWindowBuilder::new(
                        app,
                        label.clone(),
                        WebviewUrl::App(format!("index.html#{route}").into()),
                    )
                    .title(creation.title)
                    .inner_size(creation.width, creation.height)
                    .resizable(creation.resizable)
                    // 无边框：标题栏由前端 TitleBar 组件自绘
                    .decorations(false)
                    // 关闭 DWM 假阴影：Windows 10 上会残留 1px 灰边 + 放大窗口尺寸
                    .shadow(false);
                    // macOS: 保留原生红绿灯按钮（Overlay 风格），Windows/Linux 忽略
                    #[cfg(target_os = "macos")]
                    let window = window
                        .title_bar_style(tauri::utils::TitleBarStyle::Overlay)
                        .hidden_title(true);
                    let window = window
                        .build()
                        .map_err(|error| window_error("create window", error))?;
                    // Windows 11 DWM 默认给无边框窗口画 1px 灰边，移除之
                    dwm::polish_borderless_window(&window);

                    self.register_existing_window(&window, spec, context_id)?;
                    true
                }
            }
        };

        if created {
            self.broadcast_lossy(app);
            return Ok(OpenWindowResult {
                label,
                created: true,
            });
        }

        let window = self.existing_window(app, &label)?;
        self.show_and_focus(app, &window)?;
        Ok(OpenWindowResult {
            label,
            created: false,
        })
    }

    pub fn list(&self) -> AppResult<Vec<WindowSnapshot>> {
        let windows = self
            .windows
            .read()
            .map_err(|_| AppError::Internal("window registry lock poisoned".into()))?;

        let mut instances: Vec<_> = windows.values().collect();
        instances.sort_by(|a, b| {
            a.created_at
                .cmp(&b.created_at)
                .then_with(|| a.label.cmp(&b.label))
        });
        Ok(instances
            .into_iter()
            .map(WindowInstance::snapshot)
            .collect())
    }

    pub fn focus(&self, app: &AppHandle<Wry>, label: &str) -> AppResult<()> {
        let window = self.existing_window(app, label)?;
        self.show_and_focus(app, &window)
    }

    pub fn hide(&self, app: &AppHandle<Wry>, label: &str) -> AppResult<()> {
        let window = self.existing_window(app, label)?;

        window
            .hide()
            .map_err(|error| window_error("hide window", error))?;
        self.update_instance(label, |instance| {
            instance.visible = false;
            instance.focused = false;
            Ok(())
        })?;
        self.broadcast_lossy(app);
        Ok(())
    }

    pub fn close(&self, app: &AppHandle<Wry>, label: &str) -> AppResult<()> {
        self.ensure_closable(label)?;
        let window = self.existing_window(app, label)?;
        window
            .close()
            .map_err(|error| window_error("close window", error))
    }

    /// Close regardless of the dirty flag: clears `dirty` so the
    /// CloseRequested interceptor lets the close through.
    pub fn force_close(&self, app: &AppHandle<Wry>, label: &str) -> AppResult<()> {
        self.ensure_closable(label)?;
        self.update_instance(label, |instance| {
            instance.dirty = false;
            Ok(())
        })?;
        let window = self.existing_window(app, label)?;
        window
            .close()
            .map_err(|error| window_error("force close window", error))
    }

    fn ensure_closable(&self, label: &str) -> AppResult<()> {
        let kind = self.registered_kind(label)?;
        if !is_closable_kind(kind) {
            return Err(AppError::InvalidInput(format!(
                "closing {kind:?} windows through window_close is not allowed"
            )));
        }
        Ok(())
    }

    fn is_dirty(&self, label: &str) -> bool {
        self.windows
            .read()
            .ok()
            .and_then(|windows| windows.get(label).map(|instance| instance.dirty))
            .unwrap_or(false)
    }

    pub fn set_dirty(&self, app: &AppHandle<Wry>, label: &str, dirty: bool) -> AppResult<()> {
        self.update_instance(label, |instance| {
            instance.dirty = dirty;
            Ok(())
        })?;
        self.broadcast_lossy(app);
        Ok(())
    }

    pub fn toggle_main(&self, app: &AppHandle<Wry>) -> AppResult<()> {
        let window = self.existing_window(app, MAIN_WINDOW_LABEL)?;
        let visible = window
            .is_visible()
            .map_err(|error| window_error("read window visibility", error))?;

        if visible {
            self.hide(app, MAIN_WINDOW_LABEL)
        } else {
            self.focus(app, MAIN_WINDOW_LABEL)
        }
    }

    pub fn hide_tray_popup(&self, app: &AppHandle<Wry>) -> AppResult<()> {
        self.hide(app, TRAY_POPUP_WINDOW_LABEL)
    }

    pub fn show_tray_popup_at(
        &self,
        app: &AppHandle<Wry>,
        position: PhysicalPosition<i32>,
    ) -> AppResult<()> {
        let window = self.existing_window(app, TRAY_POPUP_WINDOW_LABEL)?;

        window
            .set_position(position)
            .map_err(|error| window_error("move tray popup", error))?;
        self.show_and_focus(app, &window)
    }

    pub fn handle_event(&self, app: &AppHandle<Wry>, window: &Window<Wry>, event: &WindowEvent) {
        match event {
            WindowEvent::CloseRequested { api, .. } => {
                self.handle_close_requested(app, window, api);
            }
            WindowEvent::Focused(focused) => {
                let label = window.label();

                // The tray popup is a transient window. Keep the old behavior
                // of hiding it whenever it loses focus.
                if !*focused && label == TRAY_POPUP_WINDOW_LABEL {
                    if let Err(error) = self.hide(app, label) {
                        log::error!("[window] failed to hide tray popup on blur: {error}");
                    }
                    return;
                }

                let updated = if *focused {
                    self.set_exclusive_focus(label, false)
                } else {
                    self.update_instance(label, |instance| {
                        instance.focused = false;
                        Ok(())
                    })
                };
                if updated.is_ok() {
                    if let Err(error) = self.broadcast(app) {
                        log::error!("[window] failed to broadcast focus change: {error}");
                    }
                }
            }
            WindowEvent::Destroyed if self.remove(window.label()).is_ok() => {
                if let Err(error) = self.broadcast(app) {
                    log::error!("[window] failed to broadcast destroy: {error}");
                }
            }
            _ => {}
        }
    }

    fn handle_close_requested(
        &self,
        app: &AppHandle<Wry>,
        window: &Window<Wry>,
        api: &tauri::CloseRequestApi,
    ) {
        let label = window.label();

        if label != MAIN_WINDOW_LABEL {
            self.handle_dirty_close_requested(app, window, api);
            return;
        }

        let config = app.state::<SharedConfigState>();
        let close_to_tray = config
            .close_to_tray
            .read()
            .map(|value| *value)
            .unwrap_or(true);

        if !close_to_tray {
            return;
        }

        api.prevent_close();
        if let Some(main_window) = app.get_webview_window(label) {
            if let Err(error) = main_window.hide() {
                log::error!("[window] failed to hide main window: {error}");
            }
        }

        if let Err(error) = self.update_instance(label, |instance| {
            instance.visible = false;
            instance.focused = false;
            Ok(())
        }) {
            log::error!("[window] failed to update main window state: {error}");
        }

        if let Err(error) = self.broadcast(app) {
            log::error!("[window] failed to broadcast main window state: {error}");
        }
    }

    /// Dirty windows do not close silently: the close is prevented, the
    /// window comes to the front, and its own page is asked to confirm via
    /// `window://confirm-close`. The page confirms with window_force_close.
    fn handle_dirty_close_requested(
        &self,
        app: &AppHandle<Wry>,
        window: &Window<Wry>,
        api: &tauri::CloseRequestApi,
    ) {
        let label = window.label();
        if !self.is_dirty(label) {
            return;
        }

        api.prevent_close();

        if let Ok(webview) = self.existing_window(app, label) {
            if let Err(error) = self.show_and_focus(app, &webview) {
                log::error!("[window] failed to bring dirty window forward: {error}");
            }
        }
        if let Err(error) = app.emit_to(label, WINDOW_CONFIRM_CLOSE_EVENT, label) {
            log::error!("[window] failed to request close confirmation for {label}: {error}");
        }
    }

    fn register_existing_window(
        &self,
        window: &WebviewWindow<Wry>,
        spec: WindowSpec,
        context_id: Option<String>,
    ) -> AppResult<()> {
        // Reading visibility/focus can fail transiently for a window that is
        // mid-creation; a wrong initial flag self-corrects via events, while
        // aborting registration would desync the registry permanently.
        let visible = window.is_visible().unwrap_or_else(|error| {
            log::warn!(
                "[window] failed to read visibility of {}: {error}",
                window.label()
            );
            true
        });
        let focused = window.is_focused().unwrap_or_else(|error| {
            log::warn!(
                "[window] failed to read focus of {}: {error}",
                window.label()
            );
            false
        });
        let label = derive_label(spec, context_id.as_deref())?;

        let mut windows = self
            .windows
            .write()
            .map_err(|_| AppError::Internal("window registry lock poisoned".into()))?;
        windows.insert(
            label.clone(),
            WindowInstance::new(label, spec.kind, context_id, visible, focused),
        );
        Ok(())
    }

    fn registered_kind(&self, label: &str) -> AppResult<WindowKind> {
        let windows = self
            .windows
            .read()
            .map_err(|_| AppError::Internal("window registry lock poisoned".into()))?;
        windows
            .get(label)
            .map(|instance| instance.kind)
            .ok_or_else(|| AppError::NotFound("window not found".into()))
    }

    fn existing_window(&self, app: &AppHandle<Wry>, label: &str) -> AppResult<WebviewWindow> {
        self.registered_kind(label)?;
        app.get_webview_window(label)
            .ok_or_else(|| AppError::NotFound("window not found".into()))
    }

    fn show_and_focus(&self, app: &AppHandle<Wry>, window: &WebviewWindow<Wry>) -> AppResult<()> {
        let label = window.label().to_string();
        window
            .show()
            .map_err(|error| window_error("show window", error))?;
        window
            .set_focus()
            .map_err(|error| window_error("focus window", error))?;

        self.mark_shown_and_focused(&label)?;
        self.broadcast_lossy(app);
        Ok(())
    }

    /// Mark `label` visible and focused. Focus is exclusive: every other
    /// window is marked unfocused, because OS focus events are not always
    /// delivered reliably and leaving stale `focused` flags corrupts the
    /// snapshot indefinitely.
    fn mark_shown_and_focused(&self, label: &str) -> AppResult<()> {
        self.set_exclusive_focus(label, true)
    }

    fn set_exclusive_focus(&self, label: &str, also_visible: bool) -> AppResult<()> {
        let mut windows = self
            .windows
            .write()
            .map_err(|_| AppError::Internal("window registry lock poisoned".into()))?;
        if !windows.contains_key(label) {
            return Err(AppError::NotFound("window not found".into()));
        }
        let now = unix_timestamp();
        for instance in windows.values_mut() {
            let focused = instance.label == label;
            instance.focused = focused;
            if focused {
                if also_visible {
                    instance.visible = true;
                }
                instance.last_focused_at = now;
            }
        }
        Ok(())
    }

    fn update_instance<F>(&self, label: &str, update: F) -> AppResult<()>
    where
        F: FnOnce(&mut WindowInstance) -> AppResult<()>,
    {
        let mut windows = self
            .windows
            .write()
            .map_err(|_| AppError::Internal("window registry lock poisoned".into()))?;
        let Some(instance) = windows.get_mut(label) else {
            return Err(AppError::NotFound("window not found".into()));
        };
        update(instance)
    }

    fn remove(&self, label: &str) -> AppResult<()> {
        let mut windows = self
            .windows
            .write()
            .map_err(|_| AppError::Internal("window registry lock poisoned".into()))?;
        windows
            .remove(label)
            .ok_or_else(|| AppError::NotFound("window not found".into()))?;
        Ok(())
    }

    fn broadcast(&self, app: &AppHandle<Wry>) -> AppResult<()> {
        let snapshots = self.list()?;
        app.emit(WINDOW_CHANGED_EVENT, snapshots)
            .map_err(|error| window_error("broadcast window state", error))
    }

    /// Command-path broadcasts log instead of failing the command: the state
    /// change already happened, so reporting an emit failure as a command
    /// error would mislead the frontend into retrying a completed action.
    fn broadcast_lossy(&self, app: &AppHandle<Wry>) {
        if let Err(error) = self.broadcast(app) {
            log::error!("[window] failed to broadcast window state: {error}");
        }
    }
}

fn window_spec(kind: WindowKind) -> WindowSpec {
    match kind {
        WindowKind::Main => WindowSpec {
            kind,
            label: MAIN_WINDOW_LABEL,
            requires_context: false,
            creation: None,
        },
        WindowKind::TrayPopup => WindowSpec {
            kind,
            label: TRAY_POPUP_WINDOW_LABEL,
            requires_context: false,
            creation: None,
        },
        WindowKind::Settings => WindowSpec {
            kind,
            label: SETTINGS_LABEL,
            requires_context: false,
            creation: Some(WindowCreation {
                title: "tauri-zero - Settings",
                route: "/settings",
                width: 720.0,
                height: 560.0,
                resizable: true,
            }),
        },
        WindowKind::Document => WindowSpec {
            kind,
            label: DOCUMENT_LABEL_PREFIX,
            requires_context: true,
            creation: Some(WindowCreation {
                title: "tauri-zero - Document",
                route: "/documents/{contextId}",
                width: 860.0,
                height: 640.0,
                resizable: true,
            }),
        },
    }
}

fn creation_params(spec: WindowSpec) -> AppResult<WindowCreation> {
    spec.creation.ok_or_else(|| {
        AppError::InvalidInput(format!(
            "{:?} windows are declared in tauri.conf.json and cannot be created dynamically",
            spec.kind
        ))
    })
}

fn normalize_context_id(spec: WindowSpec, context_id: Option<String>) -> AppResult<Option<String>> {
    let Some(context_id) = context_id else {
        return Ok(None);
    };
    if !spec.requires_context {
        return Err(AppError::InvalidInput(format!(
            "{:?} windows do not accept a context_id",
            spec.kind
        )));
    }
    let valid = !context_id.is_empty()
        && context_id.len() <= CONTEXT_ID_MAX_LEN
        && context_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if !valid {
        return Err(AppError::InvalidInput(
            "context_id must be 1-128 chars of [A-Za-z0-9_-]".into(),
        ));
    }
    Ok(Some(context_id))
}

fn derive_label(spec: WindowSpec, context_id: Option<&str>) -> AppResult<String> {
    if spec.requires_context {
        let Some(context_id) = context_id else {
            return Err(AppError::InvalidInput("context_id is required".into()));
        };
        Ok(format!("{prefix}{context_id}", prefix = spec.label))
    } else {
        Ok(spec.label.to_string())
    }
}

fn build_route(
    creation: WindowCreation,
    requires_context: bool,
    context_id: Option<&str>,
) -> AppResult<String> {
    if requires_context {
        let Some(context_id) = context_id else {
            return Err(AppError::InvalidInput("context_id is required".into()));
        };
        Ok(creation.route.replace("{contextId}", context_id))
    } else {
        Ok(creation.route.to_string())
    }
}

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn is_closable_kind(kind: WindowKind) -> bool {
    matches!(kind, WindowKind::Settings | WindowKind::Document)
}

fn window_error(action: &str, error: tauri::Error) -> AppError {
    AppError::Internal(format!("{action}: {error}"))
}

#[tauri::command]
pub async fn window_open(
    request: OpenWindowRequest,
    app: AppHandle<Wry>,
    state: tauri::State<'_, SharedWindowManager>,
) -> AppResult<OpenWindowResult> {
    state.open(&app, request)
}

#[tauri::command]
pub async fn window_list(
    state: tauri::State<'_, SharedWindowManager>,
) -> AppResult<Vec<WindowSnapshot>> {
    state.list()
}

#[tauri::command]
pub async fn window_focus(
    label: String,
    app: AppHandle<Wry>,
    state: tauri::State<'_, SharedWindowManager>,
) -> AppResult<()> {
    state.focus(&app, &label)
}

#[tauri::command]
pub async fn window_hide(
    label: String,
    app: AppHandle<Wry>,
    state: tauri::State<'_, SharedWindowManager>,
) -> AppResult<()> {
    state.hide(&app, &label)
}

#[tauri::command]
pub async fn window_close(
    label: String,
    app: AppHandle<Wry>,
    state: tauri::State<'_, SharedWindowManager>,
) -> AppResult<()> {
    state.close(&app, &label)
}

#[tauri::command]
pub async fn window_force_close(
    label: String,
    app: AppHandle<Wry>,
    state: tauri::State<'_, SharedWindowManager>,
) -> AppResult<()> {
    state.force_close(&app, &label)
}

#[tauri::command]
pub async fn window_set_dirty(
    label: String,
    dirty: bool,
    app: AppHandle<Wry>,
    state: tauri::State<'_, SharedWindowManager>,
) -> AppResult<()> {
    state.set_dirty(&app, &label, dirty)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_popup_uses_hyphenated_wire_name() {
        assert_eq!(
            serde_json::to_string(&WindowKind::TrayPopup).unwrap(),
            "\"tray-popup\""
        );
        assert_eq!(
            serde_json::from_str::<WindowKind>("\"tray-popup\"").unwrap(),
            WindowKind::TrayPopup
        );
        // Every variant uses kebab-case; no stray snake_case on the wire.
        for (kind, wire) in [
            (WindowKind::Main, "main"),
            (WindowKind::TrayPopup, "tray-popup"),
            (WindowKind::Settings, "settings"),
            (WindowKind::Document, "document"),
        ] {
            assert_eq!(serde_json::to_string(&kind).unwrap(), format!("\"{wire}\""));
        }
    }

    #[test]
    fn derives_document_label_and_route() {
        let spec = window_spec(WindowKind::Document);

        assert_eq!(
            derive_label(spec, Some("demo-note")).unwrap(),
            "document-demo-note"
        );
        assert_eq!(
            build_route(
                creation_params(spec).unwrap(),
                spec.requires_context,
                Some("demo-note")
            )
            .unwrap(),
            "/documents/demo-note"
        );
    }

    #[test]
    fn static_kinds_cannot_be_created_dynamically() {
        assert!(creation_params(window_spec(WindowKind::Main)).is_err());
        assert!(creation_params(window_spec(WindowKind::TrayPopup)).is_err());
        assert!(creation_params(window_spec(WindowKind::Settings)).is_ok());
        assert!(creation_params(window_spec(WindowKind::Document)).is_ok());
    }

    #[test]
    fn rejects_unsafe_document_context_id() {
        let spec = window_spec(WindowKind::Document);

        assert!(normalize_context_id(spec, Some("../secret".into())).is_err());
        assert!(normalize_context_id(spec, Some("".into())).is_err());
    }

    #[test]
    fn rejects_context_id_for_singleton_windows() {
        let spec = window_spec(WindowKind::Settings);

        assert!(normalize_context_id(spec, Some("123".into())).is_err());
        assert!(normalize_context_id(spec, None).is_ok());
    }

    #[test]
    fn only_dynamic_windows_are_closable_by_ipc() {
        assert!(!is_closable_kind(WindowKind::Main));
        assert!(!is_closable_kind(WindowKind::TrayPopup));
        assert!(is_closable_kind(WindowKind::Settings));
        assert!(is_closable_kind(WindowKind::Document));
    }

    #[test]
    fn lists_windows_in_creation_order() {
        let manager = WindowManager::new();
        let now = unix_timestamp();

        for (label, created_at) in [("b", now), ("a", now - 1)] {
            let spec = window_spec(WindowKind::Settings);
            let mut windows = manager.windows.write().unwrap();
            windows.insert(
                label.to_string(),
                WindowInstance {
                    label: label.to_string(),
                    kind: spec.kind,
                    context_id: None,
                    visible: true,
                    focused: false,
                    dirty: false,
                    created_at,
                    last_focused_at: 0,
                },
            );
        }

        let snapshots = manager.list().unwrap();
        assert_eq!(snapshots[0].label, "a");
        assert_eq!(snapshots[1].label, "b");
    }

    #[test]
    fn focus_is_exclusive_across_windows() {
        let manager = WindowManager::new();
        let spec = window_spec(WindowKind::Settings);
        for label in ["a", "b"] {
            manager.windows.write().unwrap().insert(
                label.to_string(),
                WindowInstance::new(label.into(), spec.kind, None, true, false),
            );
        }

        manager.set_exclusive_focus("a", true).unwrap();
        manager.set_exclusive_focus("b", true).unwrap();

        let snapshots = manager.list().unwrap();
        let a = snapshots.iter().find(|s| s.label == "a").unwrap();
        let b = snapshots.iter().find(|s| s.label == "b").unwrap();
        assert!(!a.focused, "a must lose focus once b is focused");
        assert!(b.focused);
        assert!(b.visible, "set_exclusive_focus with also_visible shows b");

        assert!(manager.set_exclusive_focus("missing", false).is_err());
    }
}
