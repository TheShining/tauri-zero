import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react({
      babel: {
        // React Compiler 正式版：编译期自动 memoize，需遵循 React 规则
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
    visualizer({
      filename: "bundle-analysis/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/react-router/")) return "router-vendor";
          if (id.includes("/react-i18next/") || id.includes("/i18next/")) return "i18n-vendor";
          if (id.includes("/react-dom/") || id.includes("/scheduler/") || id.includes("/react/"))
            return "react-vendor";
          if (id.includes("/zustand/")) return "state-vendor";
          if (
            id.includes("/antd/") ||
            id.includes("@ant-design") ||
            id.includes("@rc-component") ||
            id.includes("@babel/runtime") ||
            id.includes("/stylis/")
          ) {
            return "antd-vendor";
          }
          return undefined;
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
