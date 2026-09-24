use std::{
    collections::BTreeMap,
    env,
    path::{Path, PathBuf},
};

fn project_root() -> PathBuf {
    let manifest_dir = PathBuf::from(
        env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR must be provided by Cargo"),
    );

    manifest_dir
        .parent()
        .expect("src-tauri must have a parent directory")
        .to_path_buf()
}

fn resolve_mode() -> String {
    if let Ok(mode) = env::var("APP_ENV") {
        if ["development", "test", "production"].contains(&mode.as_str()) {
            return mode;
        }
    }

    // `tauri dev` 使用 Cargo debug profile，`tauri build` 使用 release。
    // `tauri dev` uses the Cargo debug profile, while `tauri build` uses release.
    let profile = env::var("PROFILE").unwrap_or_else(|_| "debug".into());

    if profile == "release" {
        "production".into()
    } else {
        "development".into()
    }
}

fn load_env_vars(project_root: &Path, mode: &str) -> BTreeMap<String, String> {
    let env_files = [
        format!(".env.{mode}.local"),
        ".env.local".to_string(),
        format!(".env.{mode}"),
        ".env".to_string(),
    ];

    let mut vars = BTreeMap::new();

    for file_name in env_files {
        let path = project_root.join(file_name);

        // 跟踪所有候选文件，包括尚不存在的本地覆盖文件，新文件创建后同样会使构建缓存失效。
        // Track all candidate files, including missing local overrides, so a newly created file invalidates the build cache as well.
        println!("cargo:rerun-if-changed={}", path.display());

        if !path.exists() {
            continue;
        }

        let entries = dotenvy::from_path_iter(&path)
            .unwrap_or_else(|error| panic!("failed to read {}: {error}", path.display()));

        for entry in entries {
            let (key, value) = entry
                .unwrap_or_else(|error| panic!("invalid entry in {}: {error}", path.display()));

            vars.entry(key).or_insert(value);
        }
    }

    vars
}

fn main() {
    let project_root = project_root();
    println!("cargo:rerun-if-env-changed=APP_ENV");
    let mode = resolve_mode();
    let mut vars = load_env_vars(&project_root, &mode);

    vars.insert("APP_ENV".into(), mode.clone());

    for (key, value) in vars {
        // 进程级变量覆盖 env 文件加载的值。
        // A process-level variable overrides the value loaded from env files.
        let value = env::var(&key).unwrap_or(value);
        println!("cargo:rustc-env={key}={value}");
    }

    tauri_build::build();
}
