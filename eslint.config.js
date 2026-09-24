import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import reactRefresh from "eslint-plugin-react-refresh";
import reactCompiler from "eslint-plugin-react-compiler";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // 全局忽略
  // Global ignores
  {
    ignores: ["dist", "src-tauri", "node_modules", "pnpm-lock.yaml"],
  },

  // JS/TS 基线
  // JavaScript/TypeScript baseline
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React 项目配置
  // React project configuration
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [eslintReact.configs["recommended-typescript"]],
    plugins: {
      "react-refresh": reactRefresh,
      "react-compiler": reactCompiler,
    },
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react-compiler/react-compiler": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // 配置文件（非项目 TS）
  // Configuration files (non-project TypeScript)
  {
    files: ["*.config.{ts,js,mjs}", "vite.config.ts", "eslint.config.js", "scripts/**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },

  // Node.js 脚本
  // Node.js scripts
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },

  // 关闭与 Prettier 冲突的格式化规则
  // Disable formatting rules that conflict with Prettier
  prettier,
);
