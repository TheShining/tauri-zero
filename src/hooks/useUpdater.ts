import { useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type Update = NonNullable<Awaited<ReturnType<typeof check>>>;

export function useUpdater() {
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);

  async function checkForUpdates() {
    setChecking(true);
    try {
      const result = await check();
      setUpdate(result);
      return result;
    } finally {
      setChecking(false);
    }
  }

  async function downloadAndInstall() {
    if (!update) return;
    await update.downloadAndInstall();
    await relaunch();
  }

  return { checking, update, checkForUpdates, downloadAndInstall };
}
