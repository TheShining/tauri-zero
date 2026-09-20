import { spawnSync } from "node:child_process";

process.env.APP_ENV = "test";
const cargo = process.platform === "win32" ? "cargo.exe" : "cargo";

const result = spawnSync(cargo, ["test", "--manifest-path", "src-tauri/Cargo.toml"], {
  stdio: "inherit",
  shell: false,
  env: process.env,
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
