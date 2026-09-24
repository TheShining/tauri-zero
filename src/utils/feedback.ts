import { message, notification } from "antd";

/**
 * 应用内统一的用户反馈入口（轻提示 message / 通知 notification）。
 * 刻意不放在 components/：api、stores 等下层模块也需要触发提示，
 * 放在 utils 层可让依赖方向保持单向（上层 → 下层）。
 * Unified user-feedback entry (message toasts / notifications).
 * Deliberately kept out of components/: lower layers like api and stores
 * also need it, so living in utils keeps the dependency direction one-way.
 */
export const feedback = {
  success: (content: string) => message.success(content),
  error: (content: string) => message.error(content),
  info: (content: string) => message.info(content),
  notify: (type: "success" | "error" | "info" | "warning", title: string, description?: string) =>
    notification[type]({ message: title, description }),
};
