import { invoke } from "@tauri-apps/api/core";

export function readTextFile(path: string) {
  return invoke<string>("read_text_file", { path });
}

export function writeTextFile(path: string, content: string) {
  return invoke<void>("write_text_file", { path, content });
}

export function fileExists(path: string) {
  return invoke<boolean>("file_exists", { path });
}
