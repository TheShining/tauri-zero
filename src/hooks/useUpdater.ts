import { useCallback, useState } from "react";
import { checkUpdate, relaunchApp } from "../api/plugins/updater";

type Update = NonNullable<Awaited<ReturnType<typeof checkUpdate>>>;

/**
 * 自动更新流程的唯一入口（检查 → 下载安装 → 重启）。
 * 设置页的 UpdateChecker 与托盘触发的 BasicLayout 检查都复用本 hook；插件调用经由 api/plugins/updater，
 * 任何调用方不允许再直接调用 plugin-updater 的 check()。
 * 返回的两个函数用 useCallback 固定引用，便于安全地放进依赖数组。
 * The single entry point of the auto-update flow (check → download & install → relaunch).
 * Both the UpdateChecker on the settings page and the tray-triggered check in BasicLayout
 * reuse this hook; plugin calls go through api/plugins/updater and no caller may touch plugin-updater directly.
 * Both returned functions are referentially stable via useCallback so they can be
 * safely placed in dependency arrays.
 */
export function useUpdater() {
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    try {
      const result = await checkUpdate();
      setUpdate(result);
      return result;
    } finally {
      setChecking(false);
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;
    await update.downloadAndInstall();
    await relaunchApp();
  }, [update]);

  return { checking, update, checkForUpdates, downloadAndInstall };
}
