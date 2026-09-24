import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCN from "../locales/zh-CN";
import enUS from "../locales/en-US";

/**
 * i18n 实例初始化。初始语言固定为回退语言：App 挂载后的 locale effect
 * 会立即把 i18n 同步到 store 中的持久化语言（zustand persist 水合是同步的）。
 * 初始值不读 useAppStore —— i18n 反向依赖 store 会造成循环导入，
 * （本实例又被 stores/api 层静态引用），必须保持本模块只依赖 locales。
 * Initializes the i18n instance with the fallback language: on App mount the
 * locale effect syncs i18n to the persisted language (zustand persist hydration
 * is synchronous). The initial value deliberately does not read useAppStore:
 * i18n depending on the store would create an import cycle (this instance is
 * statically referenced by the stores/api layers), so this module must only
 * depend on locales.
 */
void i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    "en-US": { translation: enUS },
  },
  lng: "zh-CN",
  fallbackLng: "zh-CN",
  interpolation: { escapeValue: false },
});

export default i18n;
