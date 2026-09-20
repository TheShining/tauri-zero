import { spawnSync } from "node:child_process";

const modes = new Set(["development", "test", "production"]);

function resolveMode(command) {
  const mode = process.env.APP_ENV;

  if (modes.has(mode)) {
    return mode;
  }

  // Tauri defaults: `tauri dev` is a debug build, `tauri build` is release.
  return command === "build" ? "production" : "development";
}

function run(command, args) {
  const result = spawnSync(command, args, {
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
}

function main() {
  const mode = process.argv[2];
  const command = process.argv[3];

  if (!modes.has(mode)) {
    console.error(`Invalid APP_ENV: ${mode ?? "(missing)"}`);
    console.error("Expected one of: development, test, production");
    process.exit(1);
  }

  if (!["dev", "build"].includes(command)) {
    console.error("Expected command: dev or build");
    process.exit(1);
  }

  process.env.APP_ENV = mode;
  run(process.execPath, ["node_modules/@tauri-apps/cli/tauri.js", command]);
}

export { resolveMode, main };
