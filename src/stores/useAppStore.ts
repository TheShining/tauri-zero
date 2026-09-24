import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setCloseToTray } from "../api/ipc/modules/app";
import { feedback } from "../components/AppFeedback";

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
    (set, get) => ({
      theme: "light",
      locale: "zh-CN",
      primaryColor: "#1677ff",
      closeToTray: true,
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setCloseToTray: (closeToTray) => {
        const previous = get().closeToTray;
        set({ closeToTray });
        void setCloseToTray(closeToTray).catch((error: unknown) => {
          // 后端同步失败时回滚开关并提示用户：后端是行为事实来源，
          // 不回滚会让 UI 与真实行为不一致（开关已改但后端仍是旧值）。
          // Roll back the switch and notify the user when backend sync fails: the backend
          // is the behavioral source of truth, and without a rollback the UI would diverge
          // from the real behavior (switch flipped while the backend keeps the old value).
          set({ closeToTray: previous });
          console.error("[useAppStore] set close-to-tray failed:", error);
          // 动态引入 i18n 以规避 i18n.ts 反向依赖本 store 造成的循环导入。
          // Import i18n dynamically to avoid the circular dependency caused by i18n.ts
          // importing this store back.
          void import("../i18n").then(({ default: i18n }) => {
            feedback.error(i18n.t("common.settingsSyncFailed"));
          });
        });
      },
    }),
    { name: "app-store" },
  ),
);
