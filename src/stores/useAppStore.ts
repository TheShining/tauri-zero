import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

export type ThemeMode = "light" | "dark";
export type Locale = "zh-CN" | "en-US";

interface AppState {
  theme: ThemeMode;
  locale: Locale;
  primaryColor: string;
  closeToTray: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  setPrimaryColor: (primaryColor: string) => void;
  setCloseToTray: (closeToTray: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "light",
      locale: "zh-CN",
      primaryColor: "#1677ff",
      closeToTray: true,
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setCloseToTray: (closeToTray) => {
        set({ closeToTray });
        void invoke("set_close_to_tray", { value: closeToTray });
      },
    }),
    { name: "app-store" },
  ),
);
