import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import reactRefresh from "eslint-plugin-react-refresh";
import reactCompiler from "eslint-plugin-react-compiler";
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
  {
    files: ["*.config.{ts,js,mjs}", "vite.config.ts", "eslint.config.js", "scripts/**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },

  // 关闭与 Prettier 冲突的格式化规则
  prettier,
);
