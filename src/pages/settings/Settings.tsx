import { Flex, Segmented, Switch, Typography, theme as antdTheme } from "antd";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import TitleBar from "../../layouts/titlebar/TitleBar";
import { useAppStore, type Locale, type ThemeMode } from "../../stores/useAppStore";
import { SlidersIcon, UpdateIcon } from "../../components/icons";
import UpdateChecker from "./UpdateChecker";
import "./settings.scss";

type SectionKey = "general" | "update";

/**
 * 设置窗口：左侧竖排菜单 + 右侧分组行式布局（对齐主流桌面应用的设置页形态）。
 * 窗口本体是独立单例 Tauri 窗口（kind: "settings"），本页面只负责内容；打开逻辑见 utils/settings.ts。
 * Settings window: a left vertical menu plus right grouped rows (the form factor of mainstream
 * desktop settings pages). The window itself is a standalone singleton Tauri window
 * (kind: "settings"); this page only renders content — opening logic lives in utils/settings.ts.
 */
export default function Settings() {
  const { t } = useTranslation();
  const { token } = antdTheme.useToken();
  const [section, setSection] = useState<SectionKey>("general");

  const themeMode = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const primaryColor = useAppStore((s) => s.primaryColor);
  const setPrimaryColor = useAppStore((s) => s.setPrimaryColor);
  const closeToTray = useAppStore((s) => s.closeToTray);
  const setCloseToTray = useAppStore((s) => s.setCloseToTray);

  // 原生取色器拖动时会以极高频率触发 input 事件；React onChange 每次都 setState + 跨窗口广播，
  // 各窗口 antd 全量重算 CSS token 导致界面持续闪烁、事件洪峰甚至能把新窗口饿死在加载态。
  // 因此色块用非受控 input 让拖动期间零 React 重渲染，只在 picker 关闭（原生 change）时提交一次。
  // The native color picker fires input events at high frequency while dragging; React onChange would
  // setState + broadcast across windows every tick, forcing antd to recompute all CSS tokens (persistent
  // flicker) and the event flood can starve a freshly opened webview on the loading screen.
  // The swatch is an uncontrolled input so dragging causes zero React re-renders; the color is
  // committed once when the picker closes (native change).
  const colorInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = colorInputRef.current;
    if (!input) return;
    const commit = () => {
      if (input.value !== useAppStore.getState().primaryColor) {
        setPrimaryColor(input.value);
      }
    };
    input.addEventListener("change", commit);
    return () => input.removeEventListener("change", commit);
    // key={primaryColor} 提交后会重挂载 input，依赖 primaryColor 让监听器重新绑到新节点。
    // key={primaryColor} remounts the input after each commit; depending on primaryColor
    // re-binds the listener to the fresh node.
  }, [setPrimaryColor, primaryColor]);

  const menuItems: { key: SectionKey; icon: ReactNode; label: string }[] = [
    { key: "general", icon: <SlidersIcon />, label: t("settings.menuGeneral") },
    { key: "update", icon: <UpdateIcon />, label: t("settings.menuUpdate") },
  ];

  return (
    <Flex vertical style={{ height: "100vh" }}>
      <TitleBar />
      <Flex flex={1} style={{ minHeight: 0 }}>
        <nav className="settings-menu" style={{ borderRightColor: token.colorBorderSecondary }}>
          {menuItems.map((item) => {
            const active = item.key === section;
            return (
              <div
                key={item.key}
                role="button"
                tabIndex={0}
                className={`settings-menu-item${active ? " settings-menu-item--active" : ""}`}
                style={
                  active
                    ? { background: token.colorPrimaryBg, color: token.colorPrimary }
                    : { color: token.colorText }
                }
                onClick={() => setSection(item.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setSection(item.key);
                }}
              >
                {item.icon}
                {item.label}
              </div>
            );
          })}
        </nav>

        <main className="settings-content">
          {section === "general" ? (
            <>
              <div className="settings-group">
                <Typography.Text strong className="settings-group-title">
                  {t("settings.displayGroup")}
                </Typography.Text>
                <div className="settings-row">
                  <Typography.Text>{t("settings.appearance")}</Typography.Text>
                  <Segmented<ThemeMode>
                    value={themeMode}
                    onChange={setTheme}
                    options={[
                      { value: "light", label: t("theme.light") },
                      { value: "dark", label: t("theme.dark") },
                    ]}
                  />
                </div>
                <div className="settings-row">
                  <Typography.Text>{t("settings.language")}</Typography.Text>
                  {/* 语言选项文案固定显示目标语言名，不随当前语言切换（语言切换器惯例，与 LocaleSwitch 原实现一致）。 */}
                  {/* Language option labels always read in their own language (language-switcher convention). */}
                  <Segmented<Locale>
                    value={locale}
                    onChange={setLocale}
                    options={[
                      { value: "zh-CN", label: "中文" },
                      { value: "en-US", label: "English" },
                    ]}
                  />
                </div>
                <div className="settings-row">
                  <Typography.Text>{t("common.primaryColor")}</Typography.Text>
                  <input
                    ref={colorInputRef}
                    key={primaryColor}
                    type="color"
                    defaultValue={primaryColor}
                    style={{
                      width: 48,
                      height: 28,
                      padding: 0,
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                    }}
                  />
                </div>
              </div>

              <div className="settings-group">
                <Typography.Text strong className="settings-group-title">
                  {t("settings.windowGroup")}
                </Typography.Text>
                <div className="settings-row">
                  <Typography.Text>{t("common.closeToTray")}</Typography.Text>
                  <Switch checked={closeToTray} onChange={setCloseToTray} />
                </div>
              </div>
            </>
          ) : (
            <UpdateChecker />
          )}
        </main>
      </Flex>
    </Flex>
  );
}
