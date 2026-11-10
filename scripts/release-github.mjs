import { Buffer } from "node:buffer";
import { compareVersions, createManifest, validateVersions } from "./release-manifest.mjs";

export function createGitHubClient({ repository, token, fetchImpl = fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !token) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required");
  }
  const repoPath = `/repos/${repository}`;
  return {
    async request(method, path, { body, binary = false } = {}) {
      const url = path.startsWith("/")
        ? new URL(`https://api.github.com${repoPath}${path}`)
        : new URL(path);
      if (
        url.protocol !== "https:" ||
        !["api.github.com", "uploads.github.com"].includes(url.hostname) ||
        !url.pathname.startsWith(`${repoPath}/releases`)
      ) {
        throw new Error("Unexpected GitHub API URL origin or repository");
      }
      const bytes = body instanceof Uint8Array;
      const response = await fetchImpl(url.toString(), {
        method,
        headers: {
          Accept: binary ? "application/octet-stream" : "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body !== undefined && {
            "Content-Type": bytes ? "application/json" : "application/json; charset=utf-8",
          }),
        },
        body: body === undefined ? undefined : bytes ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) {
        const error = new Error(`GitHub ${method} ${url.pathname} failed: HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      if (response.status === 204) return null;
      return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
    },
  };
}

async function listAll(api, path) {
  const items = [];
  for (let page = 1; ; page++) {
    const batch = await api.request("GET", `${path}?per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

function requireDraft(release, tag) {
  if (!release?.draft) throw new Error("Already published releases cannot be overwritten");
  if (release.prerelease || release.tag_name !== tag) {
    throw new Error("Expected a stable draft for the requested tag");
  }
}

function requireNewer(tag, releases) {
  const stable = releases.filter(
    (release) =>
      !release.draft &&
      !release.prerelease &&
      /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release.tag_name),
  );
  if (stable.some((release) => compareVersions(tag, release.tag_name) <= 0)) {
    throw new Error("Refusing an older version: a newer or equal stable release already exists");
  }
}

export async function prepareRelease(api, { tag, versions, sha }) {
  validateVersions(tag, versions);
  const releases = await listAll(api, "/releases");
  const existing = releases.find((release) => release.tag_name === tag);
  if (existing) requireDraft(existing, tag);
  requireNewer(tag, releases);
  if (existing) return existing;
  if (!/^[a-f\d]{40}$/.test(sha ?? "")) throw new Error("A resolved commit SHA is required");
  try {
    return await api.request("POST", "/releases", {
      body: { tag_name: tag, target_commitish: sha, name: tag, draft: true, prerelease: false },
    });
  } catch (error) {
    // tag 事件可能早于 release-please 的草稿创建完成，冲突时重新读取，不覆盖其说明。
    // The tag event can precede release-please's draft creation; reload on conflict without replacing its notes.
    if (error.status !== 422) throw error;
    const draft = (await listAll(api, "/releases")).find((release) => release.tag_name === tag);
    requireDraft(draft, tag);
    return draft;
  }
}

export async function assertDraftRelease(api, options) {
  const { tag, versions, releaseId } = options;
  validateVersions(tag, versions);
  if (!Number.isSafeInteger(releaseId) || releaseId <= 0) throw new Error("Invalid release ID");
  const release = await api.request("GET", `/releases/${releaseId}`);
  requireDraft(release, tag);
  requireNewer(tag, await listAll(api, "/releases"));
  return release;
}

export async function finalizeRelease(api, options) {
  const { tag, releaseId } = options;
  const release = await assertDraftRelease(api, options);
  const assets = await listAll(api, `/releases/${releaseId}/assets`);
  const { files } = await createManifest({
    ...options,
    release,
    assets,
    readAsset: (asset) => api.request("GET", `/releases/assets/${asset.id}`, { binary: true }),
  });
  const uploadUrl = release.upload_url?.split("{")[0];
  if (!uploadUrl) throw new Error("Draft release has no upload URL");

  // 所有安装包及签名先验证完毕，再替换草稿中的 JSON；发布后的资产始终不可覆盖。
  // Verify every installer and signature before replacing draft JSON; published assets are never overwritten.
  for (const [name, manifest] of Object.entries(files)) {
    const existing = assets.find((asset) => asset.name === name);
    if (existing) await api.request("DELETE", `/releases/assets/${existing.id}`);
    const body = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    const url = new URL(uploadUrl);
    url.searchParams.set("name", name);
    const uploaded = await api.request("POST", url.toString(), { body });
    if (uploaded.state !== "uploaded" || uploaded.size !== body.length || uploaded.name !== name) {
      throw new Error(`Incomplete manifest upload: ${name}`);
    }
  }
  // 由工作流的全局 publish 锁保护这次最终比较与发布，防止旧构建抢回 latest。
  // The workflow's global publish lock protects this final comparison and promotion against stale builds.
  requireDraft(await api.request("GET", `/releases/${releaseId}`), tag);
  requireNewer(tag, await listAll(api, "/releases"));
  return api.request("PATCH", `/releases/${releaseId}`, {
    body: { draft: false, make_latest: "true" },
  });
}
