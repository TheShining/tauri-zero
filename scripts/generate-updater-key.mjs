/* global console */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const keyPath = "src-tauri/updater.key";
const pubPath = `${keyPath}.pub`;

execSync(`pnpm tauri signer generate -w ${keyPath} --ci --force`, {
  stdio: "inherit",
});

const pubkey = readFileSync(pubPath, "utf8").trim();

const confPath = "src-tauri/tauri.conf.json";
const conf = JSON.parse(readFileSync(confPath, "utf8"));
conf.plugins = conf.plugins ?? {};
conf.plugins.updater = { ...conf.plugins.updater, pubkey };
writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");

console.log("Public key written to tauri.conf.json");
console.log("Private key saved to", keyPath, "(gitignored)");
