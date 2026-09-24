import { open as openUrl } from "@tauri-apps/plugin-shell";

export async function openExternal(url: string) {
  await openUrl(url);
}
