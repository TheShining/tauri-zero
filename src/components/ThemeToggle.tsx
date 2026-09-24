import { Button } from "antd";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../stores/useAppStore";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // 按钮展示将要切换到的目标主题名。
  // The button shows the name of the target theme it will switch to.
  return (
    <Button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      {theme === "light" ? t("theme.dark") : t("theme.light")}
    </Button>
  );
}
