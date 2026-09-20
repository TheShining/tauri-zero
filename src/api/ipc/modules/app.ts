import { ipcInvoke } from "../client";

export function setCloseToTray(value: boolean) {
  return ipcInvoke<void>("set_close_to_tray", { value });
}
