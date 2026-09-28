import { ipcInvoke } from "../client";

export type TrayAction = "show" | "hide" | "new_note" | "settings" | "check_update" | "quit";

export function trayAction(action: TrayAction) {
  return ipcInvoke<void>("tray_action", { action });
}
