/**
 * 标题栏窗口控制按钮使用的 12x12 线性图标，跟随 currentColor 着色，对外一律 aria-hidden。
 * 12x12 stroke icons for the title bar window controls; all tinted via currentColor and aria-hidden.
 */

export function MinimizeIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function MaximizeIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <rect
        x="1.5"
        y="1.5"
        width="9"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

export function RestoreIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <rect
        x="3.5"
        y="1"
        width="7.5"
        height="7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M1.5 3.5v7h7" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" stroke="currentColor" strokeWidth="1" />
      <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
