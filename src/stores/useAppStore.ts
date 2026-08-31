import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";
export type Locale = "zh-CN" | "en-US";

interface AppState {
  theme: ThemeMode;
  locale: Locale;
  primaryColor: string;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  setPrimaryColor: (primaryColor: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "light",
      locale: "zh-CN",
      primaryColor: "#1677ff",
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
    }),
    { name: "app-store" },
  ),
);
