import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // 全局忽略
  {
    ignores: ["dist", "src-tauri", "node_modules", "pnpm-lock.yaml"],
  },

  // JS/TS 基线
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
  {
    files: ["src/**/*.{ts,tsx}"],
    ...react.configs.flat.recommended,
    ...react.configs.flat["jsx-runtime"],
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react/prop-types": "off",
      // Tauri 项目通常允许 any 在边界处，按需收紧
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // 配置文件（非项目内 TS）
  {
    files: ["*.config.{ts,js,mjs}", "vite.config.ts", "eslint.config.js"],
    ...tseslint.configs.disableTypeChecked,
  },

  // 关闭与 Prettier 冲突的格式化规则
  prettier,
);
