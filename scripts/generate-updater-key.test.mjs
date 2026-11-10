import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { URL } from "node:url";

const packet = Buffer.alloc(42, 1);
packet.write("Ed");
const publicKey = Buffer.from(
  `untrusted comment: minisign public key: 0101010101010101\n${packet.toString("base64")}\n`,
).toString("base64");
const originalConfig =
  '{"plugins":{"updater":{"pubkey":"original","endpoints":["https://example.test"]}},"productName":"Fixture"}\n';

function fixture(t, scenario = "success") {
  const root = mkdtempSync(join(tmpdir(), "tauri updater & "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "src-tauri"));
  mkdirSync(join(root, "node_modules/@tauri-apps/cli"), { recursive: true });
  copyFileSync(
    new URL("./generate-updater-key.mjs", import.meta.url),
    join(root, "scripts/generate-updater-key.mjs"),
  );
  const configPath = join(root, "src-tauri/tauri.conf.json");
  const keyPath = join(root, "src-tauri/updater.key");
  writeFileSync(configPath, originalConfig);
  writeFileSync(
    join(root, "node_modules/@tauri-apps/cli/tauri.js"),
    `const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
assert.deepEqual(process.argv.slice(2), ["signer", "generate", "-w", path.join(process.cwd(), "src-tauri/updater.key"), "--ci"]);
fs.writeFileSync("called", "yes");
if (process.env.SCENARIO === "fail") { console.error("PRIVATE_FIXTURE_DO_NOT_PRINT"); process.exit(7); }
fs.writeFileSync("src-tauri/updater.key", "PRIVATE_FIXTURE_DO_NOT_PRINT");
if (process.env.SCENARIO !== "missing-public") fs.writeFileSync("src-tauri/updater.key.pub", process.env.PUBLIC_KEY);
if (process.env.SCENARIO === "changed-config") fs.writeFileSync("src-tauri/tauri.conf.json", '{"changed":true}');
`,
  );
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => name.toLowerCase() !== "path"),
  );
  return {
    root,
    configPath,
    keyPath,
    run(args = [], key = publicKey) {
      return spawnSync(
        process.execPath,
        [join(root, "scripts/generate-updater-key.mjs"), ...args],
        {
          cwd: root,
          env: { ...env, PATH: "", SCENARIO: scenario, PUBLIC_KEY: key },
          encoding: "utf8",
        },
      );
    },
  };
}

for (const name of ["updater.key", "updater.key.pub"]) {
  test(`refuses an existing ${name} without invoking the signer or changing files`, (t) => {
    const f = fixture(t);
    const existingPath = join(f.root, "src-tauri", name);
    writeFileSync(existingPath, "existing fixture");
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /already exists/i);
    assert.equal(readFileSync(existingPath, "utf8"), "existing fixture");
    assert.equal(readFileSync(f.configPath, "utf8"), originalConfig);
    assert.equal(existsSync(join(f.root, "called")), false);
  });
}

test("generates using the local CLI and writes only a valid public key into the updater config", (t) => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(f.configPath, "utf8")), {
    plugins: { updater: { pubkey: publicKey, endpoints: ["https://example.test"] } },
    productName: "Fixture",
  });
  assert.equal(readFileSync(f.keyPath, "utf8"), "PRIVATE_FIXTURE_DO_NOT_PRINT");
  assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_FIXTURE_DO_NOT_PRINT/);
});

for (const scenario of ["fail", "missing-public"]) {
  test(`${scenario} leaves the config byte-for-byte unchanged`, (t) => {
    const f = fixture(t, scenario);
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(join(f.root, "called")), true);
    assert.equal(readFileSync(f.configPath, "utf8"), originalConfig);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_FIXTURE_DO_NOT_PRINT/);
  });
}

for (const key of [
  "",
  "not a public key",
  Buffer.from("untrusted comment: invalid\nYQ==\n").toString("base64"),
]) {
  test(`rejects malformed generated public key ${JSON.stringify(key)}`, (t) => {
    const f = fixture(t);
    const result = f.run([], key);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /public key/i);
    assert.equal(readFileSync(f.configPath, "utf8"), originalConfig);
  });
}

test("preserves a config changed while the signer runs", (t) => {
  const f = fixture(t, "changed-config");
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(f.configPath, "utf8"), '{"changed":true}');
});

test("rejects --force without invoking the signer", (t) => {
  const f = fixture(t);
  const result = f.run(["--force"]);
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(join(f.root, "called")), false);
});

test("--help describes first-use generation without invoking the signer", (t) => {
  const f = fixture(t);
  const result = f.run(["--help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /updater\.key/);
  assert.equal(existsSync(join(f.root, "called")), false);
  assert.equal(readFileSync(f.configPath, "utf8"), originalConfig);
});
