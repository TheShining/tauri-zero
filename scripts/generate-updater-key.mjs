import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function hasPath(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function validatePublicKey(value) {
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value) return false;
  const lines = decoded.toString("utf8").trimEnd().split(/\r?\n/);
  if (lines.length !== 2 || !lines[0].startsWith("untrusted comment: ")) return false;
  const packet = Buffer.from(lines[1], "base64");
  return (
    packet.toString("base64") === lines[1] &&
    packet.length === 42 &&
    packet.subarray(0, 2).toString("ascii") === "Ed"
  );
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log("Usage: node scripts/generate-updater-key.mjs");
    console.log("Generate src-tauri/updater.key and updater.key.pub for first-time setup.");
    console.log("Existing key files are never overwritten. No --force option is supported.");
    return;
  }
  if (args.length) throw new Error("Unsupported arguments. Use --help for usage.");

  const root = resolve(import.meta.dirname, "..");
  const keyPath = resolve(root, "src-tauri/updater.key");
  const pubPath = `${keyPath}.pub`;
  // 任一文件存在都停止，避免首次接入脚本意外轮换签名身份。
  // Stop if either file exists to avoid accidentally rotating the signing identity.
  for (const path of [keyPath, pubPath]) {
    if (hasPath(path)) throw new Error(`Key file already exists: ${path}`);
  }

  const confPath = resolve(root, "src-tauri/tauri.conf.json");
  const originalStat = statSync(confPath);
  const originalConfig = readFileSync(confPath, "utf8");
  const conf = JSON.parse(originalConfig);
  if (!conf || typeof conf !== "object" || Array.isArray(conf)) {
    throw new Error("tauri.conf.json must contain a JSON object.");
  }
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, "node_modules/@tauri-apps/cli/tauri.js"),
      "signer",
      "generate",
      "-w",
      keyPath,
      "--ci",
    ],
    {
      cwd: root,
      // 捕获 CLI 输出而不转发，防止签名材料进入终端或构建日志。
      // Capture CLI output without forwarding it to keep signing material out of logs.
      stdio: "pipe",
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error("Updater key generation failed; tauri.conf.json was not modified.");
  }
  if (!hasPath(pubPath)) throw new Error("Generated public key is missing.");
  const pubkey = readFileSync(pubPath, "utf8").trim();
  if (!validatePublicKey(pubkey)) throw new Error("Generated public key is invalid.");

  // 签名期间配置可能被编辑，检测到变化时保留开发者的文件。
  // Preserve the developer's file if the config changed while the signer was running.
  const currentConfig = readFileSync(confPath, "utf8");
  const currentStat = statSync(confPath);
  if (
    currentConfig !== originalConfig ||
    ["dev", "ino", "size", "mtimeMs", "ctimeMs"].some(
      (field) => currentStat[field] !== originalStat[field],
    )
  ) {
    throw new Error("tauri.conf.json changed during generation; the config was not modified.");
  }
  conf.plugins = conf.plugins ?? {};
  conf.plugins.updater = { ...conf.plugins.updater, pubkey };
  writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");
  console.log("Public key written to tauri.conf.json");
  console.log("Private key saved to", keyPath, "(gitignored)");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
