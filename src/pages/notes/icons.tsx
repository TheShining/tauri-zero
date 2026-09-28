import type { CSSProperties, ReactNode } from "react";

// 轻量内联图标：demo 刻意不引入 @ant-design/icons，用少量 stroke 风格 SVG 保持依赖精简。
// Lightweight inline icons: the demo deliberately avoids pulling in @ant-design/icons,
// using a handful of stroke-style SVGs to keep dependencies lean.
function IconBase({ children }: { children: ReactNode }) {
  const style: CSSProperties = {
    display: "inline-block",
    verticalAlign: "-0.125em",
    lineHeight: 0,
  };
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
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function PlusIcon() {
  return (
    <IconBase>
      <path d="M8 3v10M3 8h10" />
    </IconBase>
  );
}

export function TrashIcon() {
  return (
    <IconBase>
      <path d="M2.5 4h11M6 4V2.8h4V4M4 4l.7 9h6.6L12 4M6.7 7v4M9.3 7v4" />
    </IconBase>
  );
}

export function CheckIcon() {
  return (
    <IconBase>
      <path d="M3 8.8 6.2 12 13 4" />
    </IconBase>
  );
}
