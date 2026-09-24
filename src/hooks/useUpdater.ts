import { useCallback, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type Update = NonNullable<Awaited<ReturnType<typeof check>>>;

/**
 * 自动更新流程的唯一入口（检查 → 下载安装 → 重启）。
 * 设置页的 UpdateChecker 与托盘触发的 BasicLayout 检查都复用本 hook，
 * 任何调用方不允许再直接调用 plugin-updater 的 check()。
 * 返回的两个函数用 useCallback 固定引用，便于安全地放进依赖数组。
 * The single entry point of the auto-update flow (check → download & install → relaunch).
 * Both the UpdateChecker on the settings page and the tray-triggered check in BasicLayout
 * reuse this hook; no caller may invoke plugin-updater's check() directly.
 * Both returned functions are referentially stable via useCallback so they can be
 * safely placed in dependency arrays.
 */
export function useUpdater() {
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    try {
      const result = await check();
      setUpdate(result);
      return result;
    } finally {
      setChecking(false);
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;
    await update.downloadAndInstall();
    await relaunch();
  }, [update]);

  return { checking, update, checkForUpdates, downloadAndInstall };
}
