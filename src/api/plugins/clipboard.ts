import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

export async function copyText(text: string) {
  await writeText(text);
}

export async function readClipboard() {
  return readText();
}
