import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * updater / process 插件统一封装。业务代码禁止直接 import @tauri-apps/plugin-*，
 * 一律经由本目录进入（eslint no-restricted-imports 已固化该规则）；
 * 更新流程的完整编排（检查 → 下载安装 → 重启）仍由 hooks/useUpdater 承担。
 * Unified wrapper for the updater / process plugins. Business code must not
 * import @tauri-apps/plugin-* directly — always enter through this directory
 * (enforced by eslint no-restricted-imports); full update orchestration
 * (check → download & install → relaunch) remains in hooks/useUpdater.
 */
export function checkUpdate() {
  return check();
}

export function relaunchApp() {
  return relaunch();
}
