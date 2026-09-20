import { spawnSync } from "node:child_process";
import { readdirSync, existsSync, renameSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const modes = new Set(["development", "test", "production"]);
const bundleSuffixByMode = {
  development: "dev",
  test: "test",
};
const architectureMarker = /_(x64|amd64|arm64|aarch64|universal)(?=$|[-_.])/;

function resolveMode(command) {
  const mode = process.env.APP_ENV;

  if (modes.has(mode)) {
    return mode;
  }

  // Tauri defaults: `tauri dev` is a debug build, `tauri build` is release.
  return command === "build" ? "production" : "development";
}

function bundleSuffix(mode, command) {
  return command === "build" ? (bundleSuffixByMode[mode] ?? null) : null;
}

function targetDirectory(cliArgs) {
  const targetIndex = cliArgs.indexOf("--target");
  const targetArgument =
    targetIndex === -1
      ? cliArgs.find((argument) => argument.startsWith("--target="))?.slice("--target=".length)
      : cliArgs[targetIndex + 1];

  // Tauri places cross-target builds in target/<triple>/release/bundle.
  return targetArgument
    ? join("src-tauri", "target", targetArgument, "release", "bundle")
    : join("src-tauri", "target", "release", "bundle");
}

function collectBundleFiles(root) {
  const files = new Map();

  if (!existsSync(root)) {
    return files;
  }

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);

    if (entry.isDirectory()) {
      for (const [childPath, modifiedAt] of collectBundleFiles(path)) {
        files.set(childPath, modifiedAt);
      }
      continue;
    }

    files.set(path, statSync(path).mtimeMs);
  }

  return files;
}

function renameNewBundleFiles(root, previousFiles, suffix) {
  const currentFiles = collectBundleFiles(root);
  const rootPath = resolve(root);

  for (const [path, modifiedAt] of currentFiles) {
    // Only rename files created or overwritten by this build.
    if (previousFiles.get(path) === modifiedAt) {
      continue;
    }

    const name = basename(path);
    const match = architectureMarker.exec(name);

    if (!match) {
      continue;
    }

    const alreadyRenamed = new RegExp(`_${match[1]}_${suffix}(?=$|[-_.])`).test(name);

    if (alreadyRenamed) {
      continue;
    }

    const markerEnd = match.index + match[0].length;
    const newName = `${name.slice(0, markerEnd)}_${suffix}${name.slice(markerEnd)}`;
    const newPath = join(dirname(path), newName);

    if (resolve(newPath).startsWith(rootPath) && newPath !== path && existsSync(newPath)) {
      rmSync(newPath, { force: true });
    }

    renameSync(path, newPath);
    console.info(`Renamed bundle artifact: ${relative(process.cwd(), path)} -> ${newName}`);
  }
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

  return result.status ?? 0;
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

  const cliArgs = ["node_modules/@tauri-apps/cli/tauri.js", command, ...process.argv.slice(4)];
  const suffix = bundleSuffix(mode, command);
  const bundleRoot = targetDirectory(process.argv.slice(4));
  const previousBundleFiles = suffix === null ? new Map() : collectBundleFiles(resolve(bundleRoot));

  const status = run(process.execPath, cliArgs);

  if (status !== 0) {
    process.exit(status);
  }

  if (suffix !== null) {
    renameNewBundleFiles(resolve(bundleRoot), previousBundleFiles, suffix);
  }
}

export { resolveMode, main };
