import { ipcInvoke } from "../ipc";

export function setCloseToTray(value: boolean) {
  return ipcInvoke<void>("set_close_to_tray", { value });
}
