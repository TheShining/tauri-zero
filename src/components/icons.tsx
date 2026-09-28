import type { CSSProperties, ReactNode } from "react";

// 与 pages/notes/icons.tsx 同一套轻量内联图标方案：刻意不引入 @ant-design/icons，保持依赖精简。
// Same lightweight inline-icon approach as pages/notes/icons.tsx: deliberately no @ant-design/icons,
// keeping dependencies lean.
const iconStyle: CSSProperties = {
  display: "inline-block",
  verticalAlign: "-0.125em",
  lineHeight: 0,
};

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={iconStyle}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SunIcon() {
  return (
    <IconBase>
      <circle cx="8" cy="8" r="3.2" />
      <path d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1" />
    </IconBase>
  );
}

export function MoonIcon() {
  return (
    <IconBase>
      <path d="M13.4 9.6A5.6 5.6 0 0 1 6.4 2.6a5.8 5.8 0 1 0 7 7Z" />
    </IconBase>
  );
}

export function SlidersIcon() {
  return (
    <IconBase>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
      <circle cx="10.5" cy="4" r="1.5" />
      <circle cx="5.5" cy="8" r="1.5" />
      <circle cx="11" cy="12" r="1.5" />
    </IconBase>
  );
}

export function UpdateIcon() {
  return (
    <IconBase>
      <path d="M13.6 4.4A5.9 5.9 0 1 0 14 9" />
      <path d="M13.9 1.8v2.8h-2.8" />
    </IconBase>
  );
}

// 齿轮在 16 viewBox 下难以辨认，沿用 feather settings 原稿（24 viewBox）保证可读性。
// A gear is illegible at a 16 viewBox, so this keeps the feather "settings" artwork (24 viewBox) for readability.
export function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={iconStyle}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
