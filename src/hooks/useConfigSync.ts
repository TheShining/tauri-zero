import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../stores/useAppStore";
import type { Locale, ThemeMode } from "../stores/useAppStore";

interface ConfigChangedPayload {
  theme: ThemeMode;
  locale: Locale;
}

/**
 * 全局配置跨窗口同步：任何窗口改了 theme/locale，App.tsx 会广播
 * `app://config-changed`；每个 webview（含托盘弹窗、settings、document）
 * 通过本 hook 把最新配置应用到自己独立的 zustand 实例。
 *
 * 变更方与接收方都跑了同样的 emit/apply 链路但不会产生回声风暴：
 * 接收方仅在值确实不同才 setState，因此 effect 依赖不变、不会再次 emit。
 * 初始一致性由 zustand persist（共享 localStorage）保证。
 */
export function useConfigSync() {
  useEffect(() => {
    const unlisten = listen<ConfigChangedPayload>("app://config-changed", (event) => {
      const { theme, locale } = event.payload;
      const state = useAppStore.getState();
      if (state.theme !== theme || state.locale !== locale) {
        useAppStore.setState({ theme, locale });
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);
}
