import { spawnSync } from "node:child_process";
import { resolveMode } from "./tauri-env.mjs";

const mode = resolveMode("dev");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, ["node_modules/vite/bin/vite.js", "--mode", mode]);
