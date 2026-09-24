import { open, save } from "@tauri-apps/plugin-dialog";

export async function pickFile() {
  return open({ multiple: false });
}

export async function pickSavePath(defaultPath?: string) {
  return save({ defaultPath });
}
