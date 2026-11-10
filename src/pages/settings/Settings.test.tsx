import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import type { Event } from "@tauri-apps/api/event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enUS from "../../locales/en-US";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@tauri-apps/api/core", () => ({ isTauri: vi.fn(), invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));
vi.mock("../../api/plugins/updater", () => ({ checkUpdate: vi.fn(), relaunchApp: vi.fn() }));
vi.mock("../../api/ipc/modules/window", () => ({ openWindow: vi.fn(), listWindows: vi.fn() }));
vi.mock("../../layouts/titlebar/TitleBar", () => ({ default: () => null }));

import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { checkUpdate } from "../../api/plugins/updater";
import { openWindow } from "../../api/ipc/modules/window";
import { APP_EVENTS } from "../../api/ipc/events";

const requestKey = "tauri-zero:settings-update-request";

describe("tray update navigation", () => {
  let root: Root;
  let container: HTMLDivElement;
  let openSettingsWindow: typeof import("../../utils/settings").openSettingsWindow;

  beforeEach(async () => {
    vi.resetModules();
    vi.resetAllMocks();
    localStorage.clear();
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(openWindow).mockResolvedValue({ label: "settings", created: true });
    vi.mocked(checkUpdate).mockResolvedValue(null);
    ({ openSettingsWindow } = await import("../../utils/settings"));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    localStorage.clear();
  });

  async function renderSettings() {
    const i18n = createInstance();
    await i18n.init({ lng: "en-US", resources: { "en-US": { translation: enUS } } });
    const { default: Settings } = await import("./Settings");
    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <Settings />
        </I18nextProvider>,
      );
      await Promise.resolve();
    });
  }

  it("keeps a tray request until a newly opened settings window checks and offers installation", async () => {
    vi.mocked(checkUpdate).mockResolvedValue({
      rid: 1,
      available: true,
      currentVersion: "0.5.0",
      version: "0.6.0",
      rawJson: {},
      download: vi.fn(),
      install: vi.fn(),
      downloadAndInstall: vi.fn(),
      close: vi.fn(),
    } as unknown as NonNullable<Awaited<ReturnType<typeof checkUpdate>>>);
    await openSettingsWindow("update");
    expect(checkUpdate).not.toHaveBeenCalled();
    await renderSettings();
    expect(container.querySelector("main")?.textContent).toContain("0.6.0");
    expect(
      Array.from(container.querySelectorAll("button")).some(
        (button) => button.textContent === "Download & Install",
      ),
    ).toBe(true);
    expect(checkUpdate).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(requestKey)).toBeNull();
  });

  it("switches an already open settings window to updates when another webview writes a request", async () => {
    await renderSettings();
    expect(container.querySelector("main")?.textContent).toContain("Appearance");
    await act(async () => {
      localStorage.setItem(requestKey, "other-window-request");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: requestKey,
          newValue: "other-window-request",
          storageArea: localStorage,
        }),
      );
      await Promise.resolve();
    });
    expect(container.querySelector("main")?.textContent).toContain("Already up to date");
    expect(checkUpdate).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(requestKey)).toBeNull();
  });

  it("preserves ordinary settings navigation without checking for updates", async () => {
    await openSettingsWindow();
    await renderSettings();
    expect(container.querySelector("main")?.textContent).toContain("Appearance");
    expect(checkUpdate).not.toHaveBeenCalled();
  });

  it("discards an undelivered request when opening the settings window fails", async () => {
    vi.mocked(openWindow).mockRejectedValueOnce(new Error("window unavailable"));
    await expect(openSettingsWindow("update")).rejects.toThrow("window unavailable");
    await renderSettings();
    expect(container.querySelector("main")?.textContent).toContain("Appearance");
    expect(checkUpdate).not.toHaveBeenCalled();
  });

  it("delivers a browser fallback request to settings already mounted in the same window", async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    await renderSettings();
    await act(async () => {
      await openSettingsWindow("update");
    });
    expect(container.querySelector("main")?.textContent).toContain("Already up to date");
    expect(window.location.hash).toBe("#/settings");
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("routes the actual tray event into settings and displays the result from that window", async () => {
    const handlers = new Map<string, (event: Event<unknown>) => void>();
    vi.mocked(listen).mockImplementation((event, handler) => {
      handlers.set(event, handler);
      return Promise.resolve(vi.fn());
    });
    const { default: BasicLayout } = await import("../../layouts/BasicLayout");
    const i18n = createInstance();
    await i18n.init({ lng: "en-US", resources: { "en-US": { translation: enUS } } });
    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <BasicLayout />
          </MemoryRouter>
        </I18nextProvider>,
      );
      await Promise.resolve();
    });
    await act(async () => {
      handlers.get(APP_EVENTS.trayCheckUpdate)?.({
        event: APP_EVENTS.trayCheckUpdate,
        id: 1,
        payload: null,
      });
      await Promise.resolve();
    });
    expect(checkUpdate).not.toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith({ kind: "settings" });
    await renderSettings();
    expect(container.querySelector("main")?.textContent).toContain("Already up to date");
    expect(checkUpdate).toHaveBeenCalledTimes(1);
  });
});
