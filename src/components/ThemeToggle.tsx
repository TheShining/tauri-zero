import { Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../stores/useAppStore";
import { MoonIcon, SunIcon } from "./icons";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // 图标展示将要切换到的目标主题（亮色下显示月亮 = 切到暗色），与设置页 Segmented 展示当前值的语义区分开。
  // The icon shows the target theme to switch to (a moon in light mode means "go dark"), distinct
  // from the settings-page Segmented which displays the current value.
  const target = theme === "light" ? "dark" : "light";
  const label = target === "dark" ? t("theme.dark") : t("theme.light");

  return (
    <Tooltip title={label}>
      <button
        type="button"
        className="titlebar__icon-btn"
        aria-label={label}
        onClick={() => setTheme(target)}
      >
        {target === "dark" ? <MoonIcon /> : <SunIcon />}
      </button>
    </Tooltip>
  );
}
