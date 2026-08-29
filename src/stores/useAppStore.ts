import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";
export type Locale = "zh-CN" | "en-US";

interface AppState {
  theme: ThemeMode;
  locale: Locale;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "light",
      locale: "zh-CN",
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
    }),
    { name: "app-store" },
  ),
);
