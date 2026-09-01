import { open, save } from "@tauri-apps/plugin-dialog";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { open as openUrl } from "@tauri-apps/plugin-shell";

export async function pickFile() {
  return open({ multiple: false });
}

export async function pickSavePath(defaultPath?: string) {
  return save({ defaultPath });
}

export async function notify(title: string, body: string) {
  let granted = await isPermissionGranted();
  if (!granted) {
    granted = (await requestPermission()) === "granted";
  }
  if (granted) {
    sendNotification({ title, body });
  }
}

export async function copyText(text: string) {
  await writeText(text);
}

export async function readClipboard() {
  return readText();
}

export async function openExternal(url: string) {
  await openUrl(url);
}
