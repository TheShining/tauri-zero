import { Button } from "antd";
import { useAppStore } from "../stores/useAppStore";

export default function LocaleSwitch() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  // 只改 store：i18n 实例的 changeLanguage 由 App.tsx 的 locale effect 统一收口，
  // 避免重复调用形成第二处同步源。
  // Only update the store: i18n.changeLanguage is centralized in App.tsx's locale effect,
  // avoiding a second, duplicated synchronization source.
  const toggle = () => {
    setLocale(locale === "zh-CN" ? "en-US" : "zh-CN");
  };

  // 按钮文案是目标语言名，无需走 i18n（语言切换器惯例）。
  // The button label is the target language name and needs no i18n (language-switcher convention).
  return <Button onClick={toggle}>{locale === "zh-CN" ? "EN" : "中文"}</Button>;
}
