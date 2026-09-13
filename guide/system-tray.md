# 系统托盘 / System Tray

tauri-zero 内置系统托盘功能，支持自定义 HTML 弹窗菜单、主题跟随、多语言切换、关闭最小化到托盘。

## 功能说明

### 托盘交互

| 操作 | 行为 |
|------|------|
| **左键点击**托盘图标 | 切换主窗口显示/隐藏 |
| **右键点击**托盘图标 | 弹出自定义菜单浮窗 |

### 菜单项

| 菜单项 | 说明 |
|--------|------|
| 显示窗口 | 显示主窗口并聚焦到前台 |
| 隐藏窗口 | 隐藏主窗口（进程不退出） |
| 设置 | 显示主窗口并跳转到设置页 |
| 检查更新 | 显示主窗口并触发更新检查 |
| 退出 | 退出应用程序 |

### 关闭时最小化到托盘

在 **设置** 页面可以开启/关闭「关闭时最小化到托盘」：

- **开启**（默认）：点击主窗口 × 按钮 → 窗口隐藏到托盘，进程不退出
- **关闭**：点击 × → 正常退出应用

## 主题与语言

托盘弹窗菜单会自动跟随主窗口的主题（亮色/暗色）和语言（中文/英文）设置。

- 在主窗口切换主题或语言后，托盘弹窗下次弹出时自动同步
- 弹窗使用 Ant Design 的主题 token，与主窗口视觉一致

## 技术架构

### 方案选择：自定义 HTML 弹窗

tauri-zero 采用**自定义 HTML 弹窗**而非系统原生菜单，好处是：

- 样式完全可控，支持 Ant Design 主题
- 复用 React 组件体系，无需学习原生菜单 API
- 支持国际化（i18n）
- 亮色/暗色主题自动跟随

### 实现方式

托盘弹窗复用 `index.html`，通过路由 `/tray-popup` 渲染独立的 `TrayPopup` 页面（无 BasicLayout），在独立的 frameless Tauri 窗口中显示。

```
右键托盘图标
  → Rust 计算弹出位置 → 显示 tray-popup 窗口
  → 前端渲染 TrayMenu 组件
  → 点击菜单项 → invoke("tray_action") → Rust 执行对应操作
  → 失焦自动关闭弹窗
```

## 扩展：新增托盘菜单项

如需添加新的菜单项，按以下步骤：

### 1. Rust 端：新增动作

`src-tauri/src/commands/tray.rs`：

```rust
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrayAction {
    Show,
    Hide,
    Settings,
    CheckUpdate,
    Quit,
    MyNewAction,    // ← 新增
}

#[tauri::command]
pub fn tray_action(action: TrayAction, app: AppHandle<Wry>) {
    if let Some(popup) = app.get_webview_window("tray-popup") {
        let _ = popup.hide();
    }
    match action {
        // ...
        TrayAction::MyNewAction => {
            // 你的逻辑
        }
    }
}
```

### 2. 前端：新增菜单项

`src/components/TrayMenu.tsx`：

```tsx
export type TrayActionType = "show" | "hide" | "settings" | "check_update" | "quit" | "my_new_action";

// 在 JSX 中添加：
<div className="tray-menu-item" onClick={() => void handleAction("my_new_action")}>
  {t("tray.myNewAction")}
</div>
```

### 3. 国际化文案

`src/locales/zh-CN.ts`：

```ts
tray: {
  // ...
  myNewAction: "我的新动作",
},
```

`src/locales/en-US.ts`：

```ts
tray: {
  // ...
  myNewAction: "My New Action",
},
```

### 4. 权限（如涉及窗口操作）

如果新动作需要操作窗口（如 minimize、maximize），在 `src-tauri/capabilities/default.json` 的 `permissions` 中添加对应权限：

```json
"core:window:allow-minimize",
"core:window:allow-maximize"
```

## 相关文件

| 文件 | 说明 |
|------|------|
| `src-tauri/src/tray.rs` | 托盘图标创建 + 点击事件 |
| `src-tauri/src/commands/tray.rs` | 托盘动作命令 |
| `src/components/TrayMenu.tsx` | 托盘菜单组件 |
| `src/components/TrayMenu.css` | 菜单样式 |
| `src/pages/TrayPopup.tsx` | 弹窗页面（同步、尺寸适配） |
| `src/router/createAppRouter.tsx` | `/tray-popup` 路由 |
