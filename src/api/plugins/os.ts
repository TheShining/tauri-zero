import { platform } from "@tauri-apps/plugin-os";

/** 当前操作系统名（plugin-os 的同步读取，仅在 Tauri 运行时下调用）。 / Current OS name (synchronous plugin-os read; only call under the Tauri runtime). */
export function osPlatform() {
  return platform();
}
