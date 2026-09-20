import { request } from "../request";

export interface UserInfo {
  id: string;
  name: string;
}

export function getUserInfo() {
  return request<UserInfo>("/user/info", { method: "GET" });
}
