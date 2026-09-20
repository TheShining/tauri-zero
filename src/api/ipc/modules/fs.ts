import { ipcInvoke } from "../client";

export function readTextFile(path: string) {
  return ipcInvoke<string>("read_text_file", { path });
}

export function writeTextFile(path: string, content: string) {
  return ipcInvoke<void>("write_text_file", { path, content });
}

export function fileExists(path: string) {
  return ipcInvoke<boolean>("file_exists", { path });
}
