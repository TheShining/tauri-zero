import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import { compareVersions, createManifest, validateVersions } from "./release-manifest.mjs";
import { fixture } from "./test-fixtures/release.mjs";

test("stable tags must match every local version", () => {
  const { versions } = fixture();
  assert.equal(validateVersions("v0.6.0", versions), "0.6.0");
  for (const tag of [
    "0.6.0",
    "v01.6.0",
    "v0.6",
    "v0.6.0-rc.1",
    "v0.6.0+build",
    "v0.6.0\n",
    "",
    null,
  ]) {
    assert.throws(() => validateVersions(tag, versions), /version|tag/i);
  }
  for (const key of Object.keys(versions)) {
    assert.throws(() => validateVersions("v0.6.0", { ...versions, [key]: "0.5.0" }), /version/i);
    assert.throws(() => validateVersions("v0.6.0", { ...versions, [key]: undefined }), /version/i);
  }
});

test("version comparison is numeric and rejects non-stable input", () => {
  for (const [left, right, expected] of [
    ["v1.10.0", "1.9.9", 1],
    ["1.0.0", "v1.0.0", 0],
    ["2.0.9", "2.1.0", -1],
    ["9007199254740993.0.0", "9007199254740992.0.0", 1],
  ]) {
    assert.equal(compareVersions(left, right), expected);
  }
  for (const invalid of ["01.0.0", "1.0.0-rc.1", "1.0.0+build", "1.0", "v1.0.0\n", null]) {
    assert.throws(() => compareVersions(invalid, "1.0.0"), /version/i);
    assert.throws(() => compareVersions("1.0.0", invalid), /version/i);
  }
});

test("verified assets produce five platform entries and five complete endpoint aliases", async () => {
  const input = fixture();
  const { manifest, files } = await createManifest(input);
  assert.equal(manifest.version, "0.6.0");
  assert.equal(manifest.notes, "Release notes");
  assert.equal(manifest.pub_date, "2026-11-09T08:00:00Z");
  assert.deepEqual(Object.keys(manifest.platforms).sort(), [
    "darwin-aarch64",
    "darwin-x86_64",
    "linux-x86_64",
    "linux-x86_64-deb",
    "windows-x86_64",
  ]);
  assert.deepEqual(Object.keys(files).sort(), [
    "darwin-aarch64.json",
    "darwin-x86_64.json",
    "latest.json",
    "linux-x86_64.json",
    "windows-x86_64.json",
  ]);
  for (const value of Object.values(files)) assert.deepEqual(value, manifest);
  assert.equal(
    manifest.platforms["windows-x86_64"].url,
    "https://github.com/owner/repo/releases/download/v0.6.0/tauri-zero_0.6.0_windows_x64-setup.exe",
  );
  assert.equal(
    manifest.platforms["linux-x86_64"].url,
    "https://github.com/owner/repo/releases/download/v0.6.0/tauri-zero_0.6.0_linux_amd64.AppImage",
  );
  assert.equal(
    manifest.platforms["linux-x86_64-deb"].url,
    "https://github.com/owner/repo/releases/download/v0.6.0/tauri-zero_0.6.0_linux_amd64.deb",
  );
  assert.equal(
    manifest.platforms["linux-x86_64-deb"].signature,
    input.bytes.get("tauri-zero_0.6.0_linux_amd64.deb.sig").toString(),
  );
  assert.equal(
    manifest.platforms["darwin-x86_64"].url,
    "https://github.com/owner/repo/releases/download/v0.6.0/tauri-zero_0.6.0_darwin_x64.app.tar.gz",
  );
  assert.equal(
    manifest.platforms["darwin-aarch64"].url,
    "https://github.com/owner/repo/releases/download/v0.6.0/tauri-zero_0.6.0_darwin_aarch64.app.tar.gz",
  );
  assert.equal(
    manifest.platforms["windows-x86_64"].signature,
    input.bytes.get("tauri-zero_0.6.0_windows_x64-setup.exe.sig").toString(),
  );
});

test("GitHub-normalized product names and both official AppImage architectures are accepted", async () => {
  const input = fixture();
  for (const asset of input.assets) {
    const previous = asset.name;
    asset.name = asset.name
      .replace("tauri-zero_", "._App.Name_Zero_")
      .replace("linux_amd64.AppImage", "linux_x86_64.AppImage");
    asset.browser_download_url = `https://github.com/owner/repo/releases/download/v0.6.0/${encodeURIComponent(asset.name)}`;
    input.bytes.set(asset.name, input.bytes.get(previous));
  }
  input.release.body = null;
  const { manifest } = await createManifest(input);
  assert.equal(manifest.notes, "");
  assert.equal(
    manifest.platforms["linux-x86_64"].url,
    "https://github.com/owner/repo/releases/download/v0.6.0/._App.Name_Zero_0.6.0_linux_x86_64.AppImage",
  );
});

test("other bundles never substitute for the required updater binaries", async () => {
  const input = fixture();
  input.assets = input.assets.filter((asset) => !asset.name.endsWith("-setup.exe"));
  input.assets.push({ ...input.assets[0], name: "tauri-zero_0.6.0_windows_x64.msi" });
  await assert.rejects(createManifest(input), /windows|platform|missing/i);
});

test("Debian installations require a signed Debian updater asset", async () => {
  for (const missingSuffix of [".deb", ".deb.sig"]) {
    const input = fixture();
    input.assets = input.assets.filter((asset) => !asset.name.endsWith(missingSuffix));
    await assert.rejects(createManifest(input), /deb|signature|missing/i);
  }
});

test("Debian package tampering fails cryptographic verification", async () => {
  const input = fixture();
  const asset = input.assets.find((candidate) => candidate.name.endsWith(".deb"));
  const content = Buffer.from(input.bytes.get(asset.name));
  content[0] ^= 1;
  input.bytes.set(asset.name, content);
  await assert.rejects(createManifest(input), /signature/i);
});

test("missing, duplicate, unuploaded and empty required assets are rejected", async () => {
  const mutations = [
    (input) => {
      input.assets = [];
    },
    (input) => {
      input.assets.splice(2, 2);
    },
    (input) => {
      input.assets.splice(1, 1);
    },
    (input) => {
      input.assets.push({ ...input.assets[0], id: 99 });
    },
    (input) => {
      input.assets.push({ ...input.assets[1], id: 99 });
    },
    (input) => {
      input.assets[0].state = "new";
    },
    (input) => {
      input.assets[1].state = "new";
    },
    (input) => {
      input.assets[0].size = 0;
    },
    (input) => {
      input.assets[1].size = 0;
    },
    (input) => {
      input.bytes.set(input.assets[0].name, Buffer.alloc(0));
    },
    (input) => {
      input.bytes.set(input.assets[0].name, Buffer.from("wrong size"));
    },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    await assert.rejects(createManifest(input));
  }
});

test("asset API URLs must match this repository and asset ID", async () => {
  for (const url of [
    undefined,
    "http://api.github.com/repos/owner/repo/releases/assets/10",
    "https://evil.test/repos/owner/repo/releases/assets/10",
    "https://api.github.com/repos/other/repo/releases/assets/10",
    "https://api.github.com/repos/owner/other/releases/assets/10",
    "https://api.github.com/repos/owner/repo/releases/assets/99",
    "https://api.github.com/repos/owner/repo/releases/assets/010",
    "https://api.github.com/repos/owner/repo/releases/assets/10?download=1",
    "https://api.github.com/repos/owner/repo/releases/assets/10#fragment",
    "https://api.github.com/repos/owner/repo/releases/assets/10\n",
    "https://api.github.com:8443/repos/owner/repo/releases/assets/10",
    "https://api.github.com@evil.test/repos/owner/repo/releases/assets/10",
    "https://api.github.com/repos/owner/repo/releases/10/assets",
  ]) {
    for (const index of [0, 1]) {
      const input = fixture();
      input.assets[index].url = url;
      let reads = 0;
      input.readAsset = async (asset) => {
        reads++;
        return input.bytes.get(asset.name);
      };
      await assert.rejects(createManifest(input), /api.*url/i);
      assert.equal(reads, 0);
    }
  }
});

test("installer and signature asset IDs must be positive safe integers", async () => {
  for (const id of [undefined, null, "10", 0, -1, 1.5, NaN, Infinity, 2 ** 53]) {
    for (const index of [0, 1]) {
      const input = fixture();
      input.assets[index].id = id;
      input.assets[index].url = `https://api.github.com/repos/owner/repo/releases/assets/${id}`;
      await assert.rejects(createManifest(input), /asset id/i);
    }
  }
});

test("browser download metadata never controls validation or manifest URLs", async () => {
  for (const draft of [true, false]) {
    for (const url of [
      undefined,
      null,
      "",
      "https://evil.test/file",
      "https://github.com/other/repo/releases/download/v0.5.0/file",
    ]) {
      const input = fixture();
      input.release.draft = draft;
      for (const asset of input.assets) {
        if (url === undefined) delete asset.browser_download_url;
        else asset.browser_download_url = url;
      }
      const { manifest } = await createManifest(input);
      for (const platform of Object.values(manifest.platforms)) {
        assert.match(
          platform.url,
          /^https:\/\/github\.com\/owner\/repo\/releases\/download\/v0\.6\.0\//,
        );
      }
    }
  }
});

test("draft placeholder asset URLs are accepted while manifests pin the real tag", async () => {
  const input = fixture();
  for (const asset of input.assets) {
    asset.browser_download_url = `https://github.com/owner/repo/releases/download/untagged-7b395c8448de028b853c/${encodeURIComponent(asset.name)}`;
  }
  const { manifest } = await createManifest(input);
  assert.equal(
    manifest.platforms["windows-x86_64"].url,
    "https://github.com/owner/repo/releases/download/v0.6.0/tauri-zero_0.6.0_windows_x64-setup.exe",
  );
});

test("asset API repository identity accepts differences in repository casing", async () => {
  const input = fixture({ repository: "Owner/Repo" });
  for (const asset of input.assets) {
    asset.url = asset.url.replace("/Owner/Repo/", "/owner/repo/");
  }
  const { manifest } = await createManifest(input);
  assert.equal(
    manifest.platforms["windows-x86_64"].url,
    "https://github.com/Owner/Repo/releases/download/v0.6.0/tauri-zero_0.6.0_windows_x64-setup.exe",
  );
});

test("signatures cryptographically reject a different private key even when the key ID matches", async () => {
  const input = fixture();
  const stranger = fixture();
  const sigName = input.assets[1].name;
  const inner = Buffer.from(
    stranger.signature(input.bytes.get(input.assets[0].name)).toString(),
    "base64",
  )
    .toString()
    .trimEnd()
    .split("\n");
  const packet = Buffer.from(inner[1], "base64");
  const publicPacket = Buffer.from(
    Buffer.from(input.pubkey, "base64").toString().trim().split("\n")[1],
    "base64",
  );
  publicPacket.copy(packet, 2, 2, 10);
  inner[1] = packet.toString("base64");
  const content = Buffer.from(Buffer.from(inner.join("\n") + "\n").toString("base64"));
  input.bytes.set(sigName, content);
  input.assets[1].size = content.length;
  await assert.rejects(createManifest(input), /signature/i);
});

test("asset tampering is rejected despite unchanged size and a valid signature envelope", async () => {
  const input = fixture();
  const name = input.assets[0].name;
  const content = Buffer.from(input.bytes.get(name));
  content[0] ^= 1;
  input.bytes.set(name, content);
  await assert.rejects(createManifest(input), /signature/i);
});

test("trusted comments and the global signature are authenticated", async () => {
  for (const mutate of [
    (lines) => {
      lines[2] = lines[2].replace("1794211200", "1794211201");
    },
    (lines) => {
      const bytes = Buffer.from(lines[3], "base64");
      bytes[0] ^= 1;
      lines[3] = bytes.toString("base64");
    },
  ]) {
    const input = fixture();
    const asset = input.assets[1];
    const lines = Buffer.from(input.bytes.get(asset.name).toString(), "base64")
      .toString()
      .trimEnd()
      .split("\n");
    mutate(lines);
    const content = Buffer.from(Buffer.from(lines.join("\n") + "\n").toString("base64"));
    input.bytes.set(asset.name, content);
    asset.size = content.length;
    await assert.rejects(createManifest(input), /signature/i);
  }
});

test("malformed outer base64, signature packets and public keys fail closed", async () => {
  for (const content of [
    Buffer.alloc(0),
    Buffer.from("not base64!"),
    Buffer.from("dGVzdA=="),
    Buffer.from("untrusted comment: raw minisign text"),
  ]) {
    const input = fixture();
    input.bytes.set(input.assets[1].name, content);
    input.assets[1].size = content.length;
    await assert.rejects(createManifest(input));
  }
  for (const key of ["", "invalid!", fixture().pubkey]) {
    const input = fixture();
    input.pubkey = key;
    await assert.rejects(createManifest(input), /key|signature/i);
  }
});

test("legacy Ed signatures verify the payload directly rather than its Blake2b digest", async () => {
  const input = fixture();
  for (let index = 0; index < input.assets.length; index += 2) {
    const content = input.signature(input.bytes.get(input.assets[index].name), {
      algorithm: "Ed",
      comment: "timestamp:1794211200\tfile:fixture",
    });
    input.bytes.set(input.assets[index + 1].name, content);
    input.assets[index + 1].size = content.length;
  }
  assert.equal((await createManifest(input)).manifest.version, "0.6.0");
});

test("the Rust minisign-verify prehashed test vector is interoperable", async () => {
  const input = fixture();
  input.pubkey = Buffer.from(
    "untrusted comment: minisign public key\nRWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3\n",
  ).toString("base64");
  const signature = Buffer.from(
    Buffer.from(
      [
        "untrusted comment: signature from minisign secret key",
        "RUQf6LRCGA9i559r3g7V1qNyJDApGip8MfqcadIgT9CuhV3EMhHoN1mGTkUidF/z7SrlQgXdy8ofjb7bNJJylDOocrCo8KLzZwo=",
        "trusted comment: timestamp:1556193335\tfile:test",
        "y/rUw2y8/hOUYjZU71eHp/Wo1KZ40fGy2VJEDl34XMJM+TX48Ss/17u3IvIfbVR1FkZZSNCisQbuQY+bHwhEBg==",
        "",
      ].join("\n"),
    ).toString("base64"),
  );
  for (const asset of input.assets) {
    const content = asset.name.endsWith(".sig") ? signature : Buffer.from("test");
    input.bytes.set(asset.name, content);
    asset.size = content.length;
  }
  assert.equal((await createManifest(input)).manifest.version, "0.6.0");
});
