import { Buffer } from "node:buffer";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";

export function fixture({ version = "0.6.0", repository = "owner/repo" } = {}) {
  const tag = `v${version}`;
  const versions = Object.fromEntries(
    ["packageVersion", "tauriVersion", "cargoVersion", "manifestVersion"].map((key) => [
      key,
      version,
    ]),
  );
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const keyId = randomBytes(8);
  const rawKey = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  const pubkey = Buffer.from(
    `untrusted comment: minisign public key\n${Buffer.concat([Buffer.from("Ed"), keyId, rawKey]).toString("base64")}\n`,
  ).toString("base64");
  const bytes = new Map();
  const assets = [];
  function addAsset(name, content) {
    bytes.set(name, content);
    const id = assets.length + 10;
    assets.push({
      id,
      name,
      state: "uploaded",
      size: content.length,
      url: `https://api.github.com/repos/${repository}/releases/assets/${id}`,
      browser_download_url: `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(name)}`,
    });
  }
  function signature(
    content,
    { algorithm = "ED", comment = "timestamp:1794211200\tfile:fixture\tprehashed" } = {},
  ) {
    const message =
      algorithm === "ED" ? createHash("blake2b512").update(content).digest() : content;
    const packetSignature = sign(null, message, privateKey);
    const packet = Buffer.concat([Buffer.from(algorithm), keyId, packetSignature]);
    const globalSignature = sign(
      null,
      Buffer.concat([packetSignature, Buffer.from(comment)]),
      privateKey,
    );
    return Buffer.from(
      Buffer.from(
        `untrusted comment: signature from minisign secret key\n${packet.toString("base64")}\ntrusted comment: ${comment}\n${globalSignature.toString("base64")}\n`,
      ).toString("base64"),
    );
  }
  for (const suffix of [
    "windows_x64-setup.exe",
    "linux_amd64.AppImage",
    "darwin_x64.app.tar.gz",
    "darwin_aarch64.app.tar.gz",
    "linux_amd64.deb",
  ]) {
    const name = `tauri-zero_${version}_${suffix}`;
    const content = Buffer.from(`binary fixture for ${suffix}\n`);
    addAsset(name, content);
    addAsset(`${name}.sig`, signature(content));
  }
  return {
    tag,
    versions,
    pubkey,
    assets,
    bytes,
    signature,
    release: {
      id: 7,
      tag_name: tag,
      draft: true,
      prerelease: false,
      body: "Release notes",
      created_at: "2026-11-09T08:00:00Z",
      upload_url: `https://uploads.github.com/repos/${repository}/releases/7/assets{?name,label}`,
    },
    repository,
    readAsset: async (asset) => bytes.get(asset.name),
  };
}
