import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
}

interface UserState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: "user-store",
      // token 属于敏感凭证，不落盘到 localStorage，只驻留内存；
      // 仅持久化基本用户信息，应用重启后需要重新认证获取 token。
      // The token is a sensitive credential: keep it in memory only and never persist it
      // to localStorage. Only basic user info is persisted, so the token must be
      // re-obtained through authentication after an app restart.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
