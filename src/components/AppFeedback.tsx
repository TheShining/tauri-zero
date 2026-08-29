import { message, notification } from "antd";

export const feedback = {
  success: (content: string) => message.success(content),
  error: (content: string) => message.error(content),
  info: (content: string) => message.info(content),
  notify: (type: "success" | "error" | "info" | "warning", title: string, description?: string) =>
    notification[type]({ message: title, description }),
};
