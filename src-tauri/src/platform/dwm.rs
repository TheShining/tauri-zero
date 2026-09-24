//! Windows DWM 微调，服务于无边框（`decorations: false`）窗口。

use tauri::WebviewWindow;

/// Windows 下无边框窗口的收尾处理：
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
#[cfg(target_os = "windows")]
pub fn polish_borderless_window(window: &WebviewWindow) {
    use windows::Win32::Graphics::Dwm::{
        DwmExtendFrameIntoClientArea, DwmSetWindowAttribute, DWMWA_BORDER_COLOR,
    };
    use windows::Win32::UI::Controls::MARGINS;

    // https://learn.microsoft.com/windows/win32/api/dwmapi/ne-dwmapi-dwmwindowattribute
    // 0xFFFFFFFE 即 DWMWA_COLOR_NONE：不绘制边框。
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
#[cfg(not(target_os = "windows"))]
pub fn polish_borderless_window(_window: &WebviewWindow) {}
