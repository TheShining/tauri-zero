import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

// 首次调用时按需申请通知权限，未授权则静默丢弃（桌面端的常规体验选择）。
// Requests notification permission lazily on first use; drops the notification
// silently when permission is denied (a common desktop-app UX choice).
export async function notify(title: string, body: string) {
  let granted = await isPermissionGranted();
  if (!granted) {
    granted = (await requestPermission()) === "granted";
  }
  if (granted) {
    sendNotification({ title, body });
  }
}
