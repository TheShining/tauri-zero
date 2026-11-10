import assert from "node:assert/strict";
import { test } from "node:test";
import {
  prepareRelease,
  finalizeRelease,
  createGitHubClient,
  assertDraftRelease,
} from "./release-github.mjs";
import { fixture } from "./test-fixtures/release.mjs";

function fakeGitHub(data, { published = [], failUpload = false } = {}) {
  const calls = [];
  const state = { release: structuredClone(data.release), assets: [...data.assets] };
  let nextId = 100;
  return {
    calls,
    state,
    async request(method, path, options = {}) {
      calls.push({ method, path, ...options });
      if (method === "GET" && path === "/releases?per_page=100&page=1") {
        return [...published, ...(state.release ? [state.release] : [])];
      }
      if (method === "GET" && path === "/releases/7") return state.release;
      if (method === "GET" && path === "/releases/7/assets?per_page=100&page=1") {
        return state.assets;
      }
      if (method === "GET" && path.startsWith("/releases/assets/")) {
        const id = Number(path.split("/").at(-1));
        return data.readAsset(state.assets.find((asset) => asset.id === id));
      }
      if (method === "POST" && path === "/releases") {
        state.release = { ...data.release, ...options.body };
        return state.release;
      }
      if (method === "POST" && path.startsWith("https://uploads.github.com/")) {
        if (failUpload) throw new Error("upload failed");
        const name = new URL(path).searchParams.get("name");
        const bytes = options.body;
        const asset = { id: nextId++, name, size: bytes.length, state: "uploaded" };
        state.assets.push(asset);
        return asset;
      }
      if (method === "DELETE" && path.startsWith("/releases/assets/")) {
        state.assets = state.assets.filter((asset) => asset.id !== Number(path.split("/").at(-1)));
        return null;
      }
      if (method === "PATCH" && path === "/releases/7") {
        Object.assign(state.release, options.body);
        return state.release;
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    },
  };
}

test("prepare reuses the existing draft and preserves release-please notes", async () => {
  const data = fixture();
  const api = fakeGitHub(data);
  const result = await prepareRelease(api, { ...data, sha: "a".repeat(40) });
  assert.equal(result.id, 7);
  assert.equal(result.body, "Release notes");
  assert.equal(
    api.calls.some((call) => call.method !== "GET"),
    false,
  );
});

test("prepare creates a draft for a manually pushed stable tag", async () => {
  const data = fixture();
  const api = fakeGitHub(data);
  api.state.release = null;
  await prepareRelease(api, { ...data, sha: "a".repeat(40) });
  assert.equal(api.state.release.draft, true);
  assert.equal(api.state.release.tag_name, "v0.6.0");
  assert.equal(api.state.release.target_commitish, "a".repeat(40));
});

test("published releases cannot be rebuilt or overwritten", async () => {
  const data = fixture();
  data.release.draft = false;
  const api = fakeGitHub(data);
  await assert.rejects(prepareRelease(api, data), /published/i);
  await assert.rejects(finalizeRelease(api, { ...data, releaseId: 7 }), /published/i);
  assert.equal(
    api.calls.some((call) => call.method !== "GET"),
    false,
  );
});

test("a build rerun checks the draft again instead of trusting old prepare outputs", async () => {
  const data = fixture();
  const api = fakeGitHub(data);
  await assertDraftRelease(api, { ...data, releaseId: 7 });
  api.state.release.draft = false;
  await assert.rejects(assertDraftRelease(api, { ...data, releaseId: 7 }), /published/i);
  assert.equal(
    api.calls.some((call) => call.method !== "GET"),
    false,
  );
});

test("a stale version never publishes after a newer stable release", async () => {
  const data = fixture();
  const api = fakeGitHub(data, {
    published: [{ id: 8, tag_name: "v0.10.0", draft: false, prerelease: false }],
  });
  await assert.rejects(prepareRelease(api, data), /newer|older|latest/i);
  await assert.rejects(finalizeRelease(api, { ...data, releaseId: 7 }), /newer|older|latest/i);
  assert.equal(
    api.calls.some((call) => call.method !== "GET"),
    false,
  );
});

test("version mismatches fail before any GitHub mutation", async () => {
  const data = fixture();
  data.versions.cargoVersion = "0.5.0";
  const api = fakeGitHub(data);
  await assert.rejects(prepareRelease(api, data), /version/i);
  assert.equal(api.calls.length, 0);
});

test("finalize uploads all compatibility manifests before publishing", async () => {
  const data = fixture();
  const api = fakeGitHub(data);
  await finalizeRelease(api, { ...data, releaseId: 7 });
  const uploads = api.calls.filter((call) => call.method === "POST");
  assert.deepEqual(uploads.map((call) => new URL(call.path).searchParams.get("name")).sort(), [
    "darwin-aarch64.json",
    "darwin-x86_64.json",
    "latest.json",
    "linux-x86_64.json",
    "windows-x86_64.json",
  ]);
  const manifest = JSON.parse(uploads[0].body.toString());
  assert.equal(manifest.version, "0.6.0");
  assert.equal(Object.keys(manifest.platforms).length, 5);
  assert.match(manifest.platforms["linux-x86_64-deb"].url, /linux_amd64\.deb$/);
  assert.equal(api.calls.at(-1).method, "PATCH");
  assert.deepEqual(api.calls.at(-1).body, { draft: false, make_latest: "true" });
});

test("finalize rebuilds tag-pinned URLs from draft placeholder asset URLs", async () => {
  const data = fixture();
  for (const asset of data.assets) {
    asset.browser_download_url = asset.browser_download_url.replace(
      "/v0.6.0/",
      "/untagged-7b395c8448de028b853c/",
    );
  }
  const api = fakeGitHub(data);
  await finalizeRelease(api, { ...data, releaseId: 7 });
  const manifests = api.calls
    .filter((call) => call.method === "POST")
    .map((call) => JSON.parse(call.body.toString()));
  assert.equal(manifests.length, 5);
  for (const manifest of manifests) {
    for (const platform of Object.values(manifest.platforms)) {
      assert.match(
        platform.url,
        /^https:\/\/github\.com\/owner\/repo\/releases\/download\/v0\.6\.0\//,
      );
    }
  }
  const downloads = api.calls.filter((call) => call.method === "GET" && call.binary);
  assert.deepEqual(
    downloads.map((call) => call.path).sort(),
    data.assets.map((asset) => `/releases/assets/${asset.id}`).sort(),
  );
  assert.equal(api.calls.at(-1).method, "PATCH");
  assert.equal(api.state.release.draft, false);
});

test("invalid asset API identities leave the draft untouched before binary downloads", async () => {
  for (const index of [0, 1]) {
    const data = fixture();
    data.assets[index].url =
      `https://api.github.com/repos/other/repo/releases/assets/${data.assets[index].id}`;
    const api = fakeGitHub(data);
    await assert.rejects(finalizeRelease(api, { ...data, releaseId: 7 }), /api.*url/i);
    assert.equal(api.state.release.draft, true);
    assert.equal(
      api.calls.some((call) => call.method !== "GET" || call.binary),
      false,
    );
  }
});

test("a missing platform leaves the draft and existing manifests untouched", async () => {
  const data = fixture();
  data.assets = data.assets.filter((asset) => !asset.name.includes("darwin_aarch64"));
  const api = fakeGitHub(data);
  await assert.rejects(finalizeRelease(api, { ...data, releaseId: 7 }), /missing|darwin/i);
  assert.equal(api.state.release.draft, true);
  assert.equal(
    api.calls.some((call) => call.method !== "GET"),
    false,
  );
});

test("upload failures keep the release as a draft", async () => {
  const data = fixture();
  const api = fakeGitHub(data, { failUpload: true });
  await assert.rejects(finalizeRelease(api, { ...data, releaseId: 7 }), /upload failed/);
  assert.equal(api.state.release.draft, true);
  assert.equal(
    api.calls.some((call) => call.method === "PATCH"),
    false,
  );
});

test("retry replaces only draft JSON assets and preserves signed installers", async () => {
  const data = fixture();
  const api = fakeGitHub(data);
  api.state.assets.push({ id: 99, name: "latest.json", size: 20, state: "uploaded" });
  await finalizeRelease(api, { ...data, releaseId: 7 });
  assert.deepEqual(
    api.calls.filter((call) => call.method === "DELETE").map((call) => call.path),
    ["/releases/assets/99"],
  );
  assert.equal(api.state.assets.filter((asset) => asset.name === "latest.json").length, 1);
});

test("the GitHub client fetches binary draft assets through authenticated API", async () => {
  const requests = [];
  const api = createGitHubClient({
    repository: "owner/repo",
    token: "fixture-token",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return new Response(new Uint8Array([1, 2, 3]));
    },
  });
  const bytes = await api.request("GET", "/releases/assets/12", { binary: true });
  assert.deepEqual([...bytes], [1, 2, 3]);
  assert.equal(requests[0].url, "https://api.github.com/repos/owner/repo/releases/assets/12");
  assert.equal(requests[0].options.headers.Accept, "application/octet-stream");
  assert.equal(requests[0].options.headers.Authorization, "Bearer fixture-token");
  await assert.rejects(api.request("POST", "https://attacker.example/upload"), /URL|host|origin/i);
  assert.equal(requests.length, 1);
});
