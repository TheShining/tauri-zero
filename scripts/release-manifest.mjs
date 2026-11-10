import { Buffer } from "node:buffer";
import { createHash, createPublicKey, verify } from "node:crypto";
import { TextDecoder } from "node:util";

const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const versionKeys = ["packageVersion", "tauriVersion", "cargoVersion", "manifestVersion"];
const targets = ["windows-x86_64", "linux-x86_64", "darwin-x86_64", "darwin-aarch64"];
const requiredTargets = [...targets, "linux-x86_64-deb"];
const utf8 = new TextDecoder("utf-8", { fatal: true });

function stableVersion(value, optionalV = false) {
  const normalized =
    typeof value === "string" && optionalV && value.startsWith("v") ? value.slice(1) : value;
  const match = typeof normalized === "string" ? versionPattern.exec(normalized) : null;
  if (!match || match[0] !== normalized)
    throw new Error(`Invalid stable version: ${String(value)}`);
  return normalized;
}

export function validateVersions(tag, versions) {
  if (typeof tag !== "string" || !tag.startsWith("v"))
    throw new Error("Release tag must be vX.Y.Z");
  const version = stableVersion(tag.slice(1));
  for (const name of versionKeys) {
    if (stableVersion(versions?.[name]) !== version)
      throw new Error(`${name} version does not match release tag ${tag}`);
  }
  return version;
}

export function compareVersions(left, right) {
  const a = stableVersion(left, true).split(".").map(BigInt);
  const b = stableVersion(right, true).split(".").map(BigInt);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function decodeBase64(value, label) {
  if (typeof value !== "string") throw new Error(`Invalid ${label} base64`);
  const text = value.trim();
  const bytes = Buffer.from(text, "base64");
  if (!text || bytes.toString("base64") !== text) throw new Error(`Invalid ${label} base64`);
  return bytes;
}

function lines(value, count, label) {
  const result = utf8.decode(value).trimEnd().split(/\r?\n/);
  if (result.length !== count || !result[0].startsWith("untrusted comment: "))
    throw new Error(`Invalid ${label} format`);
  return result;
}

function parsePublicKey(pubkey) {
  const text = lines(decodeBase64(pubkey, "public key"), 2, "public key");
  const packet = decodeBase64(text[1], "public key");
  if (packet.length !== 42 || !["Ed", "ED"].includes(packet.toString("ascii", 0, 2)))
    throw new Error("Invalid minisign public key packet");
  return {
    id: packet.subarray(2, 10),
    key: createPublicKey({
      key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), packet.subarray(10)]),
      type: "spki",
      format: "der",
    }),
  };
}

function verifySignature(content, signatureBytes, publicKey) {
  const signatureText = utf8.decode(signatureBytes).trim();
  const signatureLines = lines(decodeBase64(signatureText, "signature"), 4, "signature");
  const packet = decodeBase64(signatureLines[1], "signature packet");
  const global = decodeBase64(signatureLines[3], "global signature");
  const algorithm = packet.toString("ascii", 0, 2);
  if (
    packet.length !== 74 ||
    global.length !== 64 ||
    !["Ed", "ED"].includes(algorithm) ||
    !signatureLines[2].startsWith("trusted comment: ")
  ) {
    throw new Error("Invalid minisign signature packet");
  }
  if (!packet.subarray(2, 10).equals(publicKey.id))
    throw new Error("Signature key ID does not match updater public key");
  // ED 对包先做 Blake2b；Ed 直接验包，均须验证可信注释。ED hashes the payload with Blake2b; Ed verifies it directly, and both authenticate the trusted comment.
  const message = algorithm === "ED" ? createHash("blake2b512").update(content).digest() : content;
  const signature = packet.subarray(10);
  if (!verify(null, message, publicKey.key, signature))
    throw new Error("Asset signature verification failed");
  const trustedComment = Buffer.from(signatureLines[2].slice("trusted comment: ".length));
  if (!verify(null, Buffer.concat([signature, trustedComment]), publicKey.key, global))
    throw new Error("Global signature verification failed");
  return signatureText;
}

function assetTarget(name, version) {
  if (typeof name !== "string" || !/^[a-zA-Z0-9._-]+$/.test(name)) return undefined;
  const escapedVersion = version.replaceAll(".", "\\.");
  const suffixes = [
    ["windows-x86_64", "windows_x64-setup\\.exe"],
    ["linux-x86_64", "linux_(?:amd64|x86_64)\\.AppImage"],
    ["linux-x86_64-deb", "linux_amd64\\.deb"],
    ["darwin-x86_64", "darwin_x64\\.app\\.tar\\.gz"],
    ["darwin-aarch64", "darwin_aarch64\\.app\\.tar\\.gz"],
  ];
  return suffixes.find(([, suffix]) =>
    new RegExp(`^[a-zA-Z0-9._-]+_${escapedVersion}_${suffix}$`).test(name),
  )?.[0];
}

export function assetDownloadUrl(repository, tag, name) {
  return `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(name)}`;
}

function validateAsset(asset, repository) {
  if (asset.state !== "uploaded" || !Number.isSafeInteger(asset.size) || asset.size <= 0)
    throw new Error(`Asset is empty or not uploaded: ${asset.name}`);
  if (!Number.isSafeInteger(asset.id) || asset.id <= 0)
    throw new Error(`Invalid asset ID: ${asset.name}`);
  // 校验实际下载使用的 API 身份，不依赖草稿浏览器地址。Validate the API identity used for downloads, independently of draft browser URLs.
  const source =
    typeof asset.url === "string"
      ? /^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)\/releases\/assets\/([1-9]\d*)$/.exec(
          asset.url,
        )
      : null;
  if (
    !source ||
    source[1].toLowerCase() !== repository.toLowerCase() ||
    source[2] !== String(asset.id)
  )
    throw new Error(`Asset API URL must match this repository and asset ID: ${asset.name}`);
}

async function readBytes(asset, readAsset) {
  const bytes = await readAsset(asset);
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== asset.size || bytes.byteLength === 0)
    throw new Error(`Asset bytes do not match uploaded size: ${asset.name}`);
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export async function createManifest({
  tag,
  versions,
  release,
  assets,
  repository,
  pubkey,
  readAsset,
}) {
  const version = validateVersions(tag, versions);
  if (typeof repository !== "string" || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository))
    throw new Error("Invalid GitHub repository");
  if (!release || release.tag_name !== tag || release.prerelease === true)
    throw new Error("Release tag does not match stable version");
  if (typeof release.created_at !== "string" || !Number.isFinite(Date.parse(release.created_at)))
    throw new Error("Invalid release creation date");
  if (release.body != null && typeof release.body !== "string")
    throw new Error("Invalid release notes");
  if (!Array.isArray(assets) || typeof readAsset !== "function")
    throw new Error("Release assets and readAsset are required");
  const key = parsePublicKey(pubkey);
  const selected = new Map();
  for (const asset of assets) {
    const target = assetTarget(asset.name, version);
    if (!target) continue;
    if (selected.has(target)) throw new Error(`Duplicate updater assets for platform ${target}`);
    selected.set(target, asset);
  }
  const pairs = requiredTargets.map((target) => {
    const asset = selected.get(target);
    if (!asset) throw new Error(`Missing updater asset for platform ${target}`);
    const signatures = assets.filter((candidate) => candidate.name === `${asset.name}.sig`);
    if (signatures.length !== 1)
      throw new Error(`Missing or duplicate signature asset: ${asset.name}`);
    validateAsset(asset, repository);
    validateAsset(signatures[0], repository);
    return [target, asset, signatures[0]];
  });
  const platforms = {};
  for (const [target, asset, sig] of pairs) {
    const content = await readBytes(asset, readAsset);
    const signature = verifySignature(content, await readBytes(sig, readAsset), key);
    platforms[target] = { signature, url: assetDownloadUrl(repository, tag, asset.name) };
  }
  const manifest = { version, notes: release.body ?? "", pub_date: release.created_at, platforms };
  // 每个历史端点都携带完整清单，让已安装客户端继续更新。Every legacy endpoint carries the complete manifest so installed clients can keep updating.
  const files = Object.fromEntries(
    ["latest.json", ...targets.map((target) => `${target}.json`)].map((name) => [name, manifest]),
  );
  return { manifest, files };
}
