/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_PUBLIC_APP_TITLE: string;
  readonly APP_PUBLIC_ENV: "development" | "test" | "production";
  readonly APP_PUBLIC_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
