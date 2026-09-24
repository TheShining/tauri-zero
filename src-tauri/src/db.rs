use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::Path;
use std::str::FromStr;

/// 由 `build.rs` 在编译期注入的数据库名。
/// Database filename injected by `build.rs` at compile time.
pub fn db_filename() -> &'static str {
    option_env!("APP_SERVER_DB_FILENAME").unwrap_or("tauri-zero.db")
}

/// 由 `build.rs` 在编译期注入的 SQLite 连接池上限。
/// Maximum SQLite pool size injected by `build.rs` at compile time.
pub fn db_max_connections() -> u32 {
    option_env!("APP_SERVER_DB_POOL_SIZE")
        .unwrap_or("5")
        .parse()
        .expect("APP_SERVER_DB_POOL_SIZE must be a positive integer")
}

pub async fn init_pool(db_path: &Path, max_connections: u32) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::from_str(db_path.to_str().unwrap_or_default())?
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(max_connections)
        .connect_with(options)
        .await?;

    // 运行迁移（编译时嵌入 SQL 文件）。
    // Run migrations using SQL files embedded at compile time.
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| sqlx::Error::Migrate(Box::new(e)))?;

    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::{db_filename, db_max_connections};

    #[test]
    fn loads_test_database_configuration() {
        // `pnpm rust:test` 会在调用 Cargo 前注入 APP_ENV=test。
        // `pnpm rust:test` injects APP_ENV=test before invoking Cargo.
        if option_env!("APP_ENV") != Some("test") {
            return;
        }

        assert_eq!(db_filename(), "tauri-zero-test.db");
        assert_eq!(db_max_connections(), 2);
    }
}
