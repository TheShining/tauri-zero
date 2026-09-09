import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const normalizeId = (id: string) => id.replace(/\\/g, "/");

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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "router-vendor",
              test: (id: string) => normalizeId(id).includes("/react-router/"),
              priority: 50,
            },
            {
              name: "i18n-vendor",
              test: (id: string) => {
                const n = normalizeId(id);
                return n.includes("/react-i18next/") || n.includes("/i18next/");
              },
              priority: 40,
            },
            {
              name: "react-vendor",
              test: (id: string) => {
                const n = normalizeId(id);
                return (
                  n.includes("/react-dom/") || n.includes("/scheduler/") || n.includes("/react/")
                );
              },
              priority: 30,
            },
            {
              name: "state-vendor",
              test: (id: string) => normalizeId(id).includes("/zustand/"),
              priority: 20,
            },
            {
              name: "antd-vendor",
              test: (id: string) => {
                const n = normalizeId(id);
                return (
                  n.includes("/antd/") ||
                  n.includes("@ant-design") ||
                  n.includes("@rc-component") ||
                  n.includes("@babel/runtime") ||
                  n.includes("/stylis/")
                );
              },
              priority: 10,
            },
          ],
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
