import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import enUS from "../locales/en-US";

type Update = NonNullable<Awaited<ReturnType<typeof checkUpdate>>>;
type DownloadEvent = Parameters<NonNullable<Parameters<Update["download"]>[0]>>[0];

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../api/plugins/updater", () => ({ checkUpdate: vi.fn(), relaunchApp: vi.fn() }));
vi.mock("../api/ipc/modules/window", () => ({ listWindows: vi.fn() }));

import { checkUpdate, relaunchApp } from "../api/plugins/updater";
import { listWindows } from "../api/ipc/modules/window";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function candidate() {
  return {
    rid: 1,
    available: true,
    currentVersion: "0.5.0",
    version: "0.6.0",
    rawJson: {},
    download: vi
      .fn<(...args: [((event: DownloadEvent) => void)?]) => Promise<void>>()
      .mockResolvedValue(undefined),
    install: vi.fn().mockResolvedValue(undefined),
    downloadAndInstall: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe("useUpdater", () => {
  let root: Root;
  let container: HTMLDivElement;
  let useUpdater: typeof import("./useUpdater").useUpdater;
  let first: ReturnType<typeof useUpdater>;
  let second: ReturnType<typeof useUpdater>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(listWindows).mockResolvedValue([]);
    vi.mocked(relaunchApp).mockResolvedValue(undefined);
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    ({ useUpdater } = await import("./useUpdater"));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    function Probe() {
      const one = useUpdater();
      const two = useUpdater();
      useEffect(() => {
        first = one;
        second = two;
      });
      return null;
    }
    await act(async () => {
      root.render(<Probe />);
      await Promise.resolve();
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  it("exposes a failed check and can check again after failure", async () => {
    vi.mocked(checkUpdate).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(null);
    await act(async () => {
      await first.checkForUpdates().catch(() => undefined);
    });
    expect(first.error).toEqual({ stage: "check", message: "offline" });
    expect(first.checking).toBe(false);
    await act(async () => {
      await first.checkForUpdates();
    });
    expect(first.phase).toBe("current");
    expect(first.error).toBeNull();
  });

  it("shares state and suppresses duplicate checks across hook instances", async () => {
    const pending = deferred<null>();
    vi.mocked(checkUpdate).mockReturnValue(pending.promise);
    let active!: Promise<unknown>;
    let duplicate!: Promise<unknown>;
    await act(async () => {
      active = first.checkForUpdates();
      duplicate = second.checkForUpdates();
      await Promise.resolve();
    });
    const calls = vi.mocked(checkUpdate).mock.calls.length;
    expect(second.checking).toBe(true);
    await act(async () => {
      pending.resolve(null);
      await Promise.all([active, duplicate]);
    });
    expect(calls).toBe(1);
    expect(second.phase).toBe("current");
  });

  it("reports byte progress and downloads only once while another action is pending", async () => {
    const update = candidate();
    const pending = deferred<void>();
    update.download.mockImplementation(async (progress) => {
      progress?.({ event: "Started", data: { contentLength: 100 } });
      progress?.({ event: "Progress", data: { chunkLength: 40 } });
      await pending.promise;
      progress?.({ event: "Finished" });
    });
    vi.mocked(checkUpdate).mockResolvedValue(update as never);
    await act(async () => {
      await first.checkForUpdates();
    });
    let active!: Promise<unknown>;
    await act(async () => {
      active = first.downloadAndInstall();
      await second.downloadAndInstall();
      await second.checkForUpdates();
    });
    expect(second.progress).toEqual({ downloaded: 40, total: 100 });
    expect(second.phase).toBe("downloading");
    expect(update.download).toHaveBeenCalledTimes(1);
    expect(checkUpdate).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve();
      await active;
    });
    expect(update.install).toHaveBeenCalledTimes(1);
    expect(update.downloadAndInstall).not.toHaveBeenCalled();
    expect(relaunchApp).toHaveBeenCalledTimes(1);
  });

  it("blocks installation when a window becomes dirty during download and retries without downloading again", async () => {
    const update = candidate();
    vi.mocked(checkUpdate).mockResolvedValue(update as never);
    vi.mocked(listWindows)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { label: "document-1", kind: "document", visible: true, focused: true, dirty: true },
      ])
      .mockResolvedValue([]);
    await act(async () => {
      await first.checkForUpdates();
      await first.downloadAndInstall();
    });
    expect(first.phase).toBe("blocked");
    expect(update.install).not.toHaveBeenCalled();
    expect(relaunchApp).not.toHaveBeenCalled();
    await act(async () => {
      await first.downloadAndInstall();
    });
    expect(update.download).toHaveBeenCalledTimes(1);
    expect(update.install).toHaveBeenCalledTimes(1);
  });

  it("refuses to download while any authoritative window snapshot is dirty", async () => {
    const update = candidate();
    vi.mocked(checkUpdate).mockResolvedValue(update as never);
    vi.mocked(listWindows).mockResolvedValue([
      { label: "document-1", kind: "document", visible: false, focused: false, dirty: true },
    ]);
    await act(async () => {
      await first.checkForUpdates();
      await first.downloadAndInstall();
    });
    expect(first.phase).toBe("blocked");
    expect(update.download).not.toHaveBeenCalled();
  });

  it.each(["download", "install"] as const)(
    "disposes a failed %s resource and retries with a fresh update",
    async (stage) => {
      const broken = candidate();
      const fresh = candidate();
      broken[stage].mockRejectedValueOnce(new Error("failed"));
      vi.mocked(checkUpdate)
        .mockResolvedValueOnce(broken as never)
        .mockResolvedValueOnce(fresh as never);
      await act(async () => {
        await first.checkForUpdates();
        await first.downloadAndInstall();
      });
      expect(first.error).toEqual({ stage, message: "failed" });
      expect(first.busy).toBe(false);
      expect(broken.close).toHaveBeenCalledTimes(1);
      expect(relaunchApp).not.toHaveBeenCalled();
      await act(async () => {
        await first.downloadAndInstall();
      });
      expect(fresh.download).toHaveBeenCalledTimes(1);
      expect(fresh.install).toHaveBeenCalledTimes(1);
      expect(first.phase).toBe("installed");
    },
  );

  it("fails closed when authoritative window state cannot be read", async () => {
    const update = candidate();
    vi.mocked(checkUpdate).mockResolvedValue(update as never);
    vi.mocked(listWindows)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("IPC unavailable"));
    await act(async () => {
      await first.checkForUpdates();
      await first.downloadAndInstall();
    });
    expect(first.error?.stage).toBe("windows");
    expect(update.install).not.toHaveBeenCalled();
  });

  it("does not reinstall when only the relaunch failed", async () => {
    const update = candidate();
    vi.mocked(checkUpdate).mockResolvedValue(update as never);
    vi.mocked(relaunchApp)
      .mockRejectedValueOnce(new Error("restart failed"))
      .mockResolvedValue(undefined);
    await act(async () => {
      await first.checkForUpdates();
      await first.downloadAndInstall();
    });
    expect(first.error?.stage).toBe("restart");
    await act(async () => {
      await first.downloadAndInstall();
    });
    expect(update.install).toHaveBeenCalledTimes(1);
    expect(relaunchApp).toHaveBeenCalledTimes(2);
  });

  it("does not invoke updater operations when another window owns the Web Lock", async () => {
    const request = vi.fn(
      (_name: string, _options: LockOptions, callback: (lock: Lock | null) => Promise<unknown>) =>
        callback(null),
    );
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    await act(async () => {
      await first.checkForUpdates();
    });
    expect(checkUpdate).not.toHaveBeenCalled();
    expect(first.phase).toBe("busy");
    expect(first.busy).toBe(false);
  });

  it("reports a lock API failure and releases the local guard for retry", async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error("lock unavailable"));
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    await act(async () => {
      await first.checkForUpdates().catch(() => undefined);
    });
    expect(first.error).toEqual({ stage: "check", message: "lock unavailable" });
    expect(first.busy).toBe(false);
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    vi.mocked(checkUpdate).mockResolvedValueOnce(null);
    await act(async () => {
      await first.checkForUpdates();
    });
    expect(first.phase).toBe("current");
  });

  it("renders failed and current check results in settings without unhandled click rejections", async () => {
    const i18n = createInstance();
    await i18n.init({ lng: "en-US", resources: { "en-US": { translation: enUS } } });
    const { default: UpdateChecker } = await import("../pages/settings/UpdateChecker");
    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <UpdateChecker />
        </I18nextProvider>,
      );
      await Promise.resolve();
    });
    vi.mocked(checkUpdate).mockRejectedValueOnce(new Error("offline"));
    await act(async () => {
      container.querySelector("button")?.click();
      await Promise.resolve();
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("offline");
    vi.mocked(checkUpdate).mockResolvedValueOnce(null);
    await act(async () => {
      container.querySelector("button")?.click();
      await Promise.resolve();
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain("up to date");
  });

  it("renders download progress and disables settings actions until installation finishes", async () => {
    const i18n = createInstance();
    await i18n.init({ lng: "en-US", resources: { "en-US": { translation: enUS } } });
    const { default: UpdateChecker } = await import("../pages/settings/UpdateChecker");
    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <UpdateChecker />
        </I18nextProvider>,
      );
      await Promise.resolve();
    });
    const update = candidate();
    const pending = deferred<void>();
    update.download.mockImplementation(async (progress) => {
      progress?.({ event: "Started", data: { contentLength: 100 } });
      progress?.({ event: "Progress", data: { chunkLength: 40 } });
      await pending.promise;
    });
    vi.mocked(checkUpdate).mockResolvedValueOnce(update as never);
    await act(async () => {
      await first.checkForUpdates();
    });
    let active!: Promise<void>;
    await act(async () => {
      active = first.downloadAndInstall();
      await Promise.resolve();
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain("40%");
    expect(
      Array.from(container.querySelectorAll("button")).every((button) => button.disabled),
    ).toBe(true);
    await act(async () => {
      pending.resolve();
      await active;
    });
  });
});
