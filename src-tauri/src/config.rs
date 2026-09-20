/// Centralized application configuration for the desktop app.
pub struct AppConfig {
    pub db_filename: String,
    pub db_max_connections: u32,
    pub default_close_to_tray: bool,
}

impl AppConfig {
    pub fn load() -> Self {
        Self {
            db_filename: "tauri-zero.db".into(),
            db_max_connections: 5,
            default_close_to_tray: true,
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self::load()
    }
}
