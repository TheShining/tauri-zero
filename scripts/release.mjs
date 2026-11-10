import { appendFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  assertDraftRelease,
  createGitHubClient,
  finalizeRelease,
  prepareRelease,
} from "./release-github.mjs";
import { validateVersions } from "./release-manifest.mjs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

async function main() {
  const command = process.argv[2];
  if (!["check", "prepare", "guard", "finalize"].includes(command)) {
    throw new Error(
      "Usage: node scripts/release.mjs check|prepare|guard|finalize (RELEASE_TAG=vX.Y.Z)",
    );
  }
  const tag = process.env.RELEASE_TAG;
  const config = readJson("src-tauri/tauri.conf.json");
  const cargo = readFileSync("src-tauri/Cargo.toml", "utf8");
  const packageSection = cargo.match(/^\[package\]\s*\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1];
  const versions = {
    packageVersion: readJson("package.json").version,
    tauriVersion: config.version,
    cargoVersion: packageSection?.match(/^version\s*=\s*"([^"]+)"/m)?.[1],
    manifestVersion: readJson(".release-please-manifest.json")["."],
  };
  validateVersions(tag, versions);
  if (command === "check") {
    console.log(`Version files agree with ${tag}`);
    return;
  }
  const api = createGitHubClient({
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GITHUB_TOKEN,
  });
  if (command === "guard") {
    await assertDraftRelease(api, { tag, versions, releaseId: Number(process.env.RELEASE_ID) });
    console.log(`Draft ${tag} is still eligible for building`);
    return;
  }
  if (command === "prepare") {
    if (!process.env.TAURI_SIGNING_PRIVATE_KEY?.trim()) {
      throw new Error("Configure TAURI_SIGNING_PRIVATE_KEY before releasing");
    }
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const release = await prepareRelease(api, { tag, versions, sha });
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `release_id=${release.id}\nsha=${sha}\ntag=${tag}\n`,
      );
    }
    console.log(`Prepared draft ${tag} (release ${release.id})`);
    return;
  }
  await finalizeRelease(api, {
    tag,
    versions,
    releaseId: Number(process.env.RELEASE_ID),
    repository: process.env.GITHUB_REPOSITORY,
    pubkey: config.plugins.updater.pubkey,
  });
  console.log(`Published verified release ${tag}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
