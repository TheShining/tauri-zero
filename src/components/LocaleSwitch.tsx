import { Button } from "antd";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../stores/useAppStore";

export default function LocaleSwitch() {
  const { i18n } = useTranslation();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  const toggle = () => {
    const next = locale === "zh-CN" ? "en-US" : "zh-CN";
    setLocale(next);
    void i18n.changeLanguage(next);
  };

  return <Button onClick={toggle}>{locale === "zh-CN" ? "EN" : "中文"}</Button>;
}
