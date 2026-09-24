//! Windows DWM 微调，服务于无边框（`decorations: false`）窗口。
//! Windows DWM tuning for frameless (`decorations: false`) windows.

use tauri::WebviewWindow;

/// Windows 下无边框窗口的收尾处理。
///
/// 1. `DWMWA_BORDER_COLOR = NONE`（仅 Windows 11 build 22000+）：
///    阻止 DWM 给窗口画默认的 1px 灰边（浅色约 #a5a5a5）。
///    Windows 10 不支持该属性值，调用静默失败，无副作用。
/// 2. `DwmExtendFrameIntoClientArea` 扩展 1px 玻璃边框：
///    向 DWM 声明"这里有一圈框架"，DWM 就会为窗口绘制原生投影。
///    这是无边框窗口获得系统阴影的标准做法（Chrome CEF、Qt 无边框框架同款）；
///    1px 扩展区被 WebView2 内容覆盖不可见，因此只留阴影、不留边框。
///
/// 前置条件：窗口必须关闭 tao 的假阴影（`shadow: false`），否则 tao 会把
/// 窗口尺寸向外放大一圈并在 Win10 的非客户区残留 1px 灰边。
/// 其他平台为 no-op。
///
/// Finishes frameless windows on Windows.
///
/// 1. `DWMWA_BORDER_COLOR = NONE` (Windows 11 build 22000+ only):
///    prevents DWM from drawing the default 1px gray border (about #a5a5a5
///    in light mode). Windows 10 does not support this attribute value; the
///    call fails silently with no side effects.
/// 2. `DwmExtendFrameIntoClientArea` extends a 1px glass frame:
///    it tells DWM that a frame exists, so DWM draws the native shadow.
///    This is the standard way for frameless windows to receive system
///    shadows (also used by Chrome CEF and frameless Qt windows). The 1px
///    extension is covered by WebView2 content, leaving a shadow but no border.
///
/// Prerequisite: the window must disable tao's fake shadow (`shadow: false`);
/// otherwise tao enlarges the window outward and leaves a 1px gray border in
/// the non-client area on Windows 10. This is a no-op on other platforms.
#[cfg(target_os = "windows")]
pub fn polish_borderless_window(window: &WebviewWindow) {
    use windows::Win32::Graphics::Dwm::{
        DwmExtendFrameIntoClientArea, DwmSetWindowAttribute, DWMWA_BORDER_COLOR,
    };
    use windows::Win32::UI::Controls::MARGINS;

    // 属性枚举参考：https://learn.microsoft.com/windows/win32/api/dwmapi/ne-dwmapi-dwmwindowattribute；
    // 0xFFFFFFFE 即 DWMWA_COLOR_NONE，不绘制边框。
    // Attribute enumeration reference: https://learn.microsoft.com/windows/win32/api/dwmapi/ne-dwmapi-dwmwindowattribute;
    // 0xFFFFFFFE is DWMWA_COLOR_NONE and draws no border.
    const DWMWA_COLOR_NONE: u32 = 0xFFFF_FFFE;

    let Ok(hwnd) = window.hwnd() else {
        return;
    };

    unsafe {
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_BORDER_COLOR,
            &DWMWA_COLOR_NONE as *const u32 as *const core::ffi::c_void,
            std::mem::size_of::<u32>() as u32,
        );

        let margins = MARGINS {
            cxLeftWidth: 1,
            cxRightWidth: 1,
            cyTopHeight: 1,
            cyBottomHeight: 1,
        };
        let _ = DwmExtendFrameIntoClientArea(hwnd, &margins);
    }
}

/// 非 Windows 平台的空实现。
/// No-op implementation on non-Windows platforms.
#[cfg(not(target_os = "windows"))]
pub fn polish_borderless_window(_window: &WebviewWindow) {}
