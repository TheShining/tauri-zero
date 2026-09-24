import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// process 是 Node.js 全局变量，此处允许其使用。
// process is a Node.js global; allow its use here.
// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const normalizeId = (id: string) => id.replace(/\\/g, "/");

// 开发模式自动注入独立 React DevTools（localhost:8097），生产构建不带。
// Automatically inject standalone React DevTools (localhost:8097) in development mode; production builds exclude it.
function reactDevtools() {
  return {
    name: "react-devtools-inject",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace("<head>", '<head>\n    <script src="http://localhost:8097"></script>');
    },
  };
}

// Vite 配置参考。
// Vite configuration reference: https://vite.dev/config/
export default defineConfig(async () => ({
  envPrefix: ["APP_PUBLIC_"],
  plugins: [
    reactDevtools(),
    react({
      babel: {
        // React Compiler 正式版：编译期自动 memoize，需遵循 React 规则。
        // Stable React Compiler: automatic compile-time memoization that requires following the Rules of React.
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

  // 以下 Vite 选项专为 Tauri 开发定制，只在 `tauri dev` 或 `tauri build` 中生效。
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`.
  //
  // 1. 防止 Vite 遮蔽 Rust 错误。
  // Prevent Vite from obscuring Rust errors.
  clearScreen: false,
  // 2. Tauri 期望固定端口，端口不可用时直接失败。
  // Tauri expects a fixed port; fail if that port is not available.
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
      // 3. 让 Vite 忽略 `src-tauri` 的文件监听。
      // Tell Vite to ignore watching `src-tauri`.
      ignored: ["**/src-tauri/**"],
    },
  },
}));
