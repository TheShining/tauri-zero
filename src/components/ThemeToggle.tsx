import { Button } from "antd";
import { useAppStore } from "../stores/useAppStore";

export default function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  return (
    <Button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      {theme === "light" ? "暗色" : "亮色"}
    </Button>
  );
}
