import { useEffect } from "react";
import { revealWindow } from "../api/ipc/modules/window";

/**
 * 真实页面内容就绪后通知后端显示窗口。
 * 本组件挂在 Suspense 边界内部：懒加载路由解析期间整个子树被兜底内容替换，本组件不会挂载，
 * 只有真实路由页面渲染后 effect 才执行，因此窗口绝不会在 Loading 兜底阶段露出。
 * Reveals the window once the real page content is ready.
 * Mounted inside the Suspense boundary: while lazy routes resolve, the whole subtree is replaced
 * by the fallback and this component never mounts; its effect runs only after the real route page
 * has rendered, so the window can never surface during the loading fallback stage.
 */
export default function WindowReveal() {
  // 等首帧调度后再上报：rAF 回调在真实页面挂载的同一轮事件循环里触发，此时 DOM 已提交；
  // 后端兜底超时仍在，前端异常时窗口也保证强制显示。
  // Report after the first frame is scheduled: the rAF callback fires in the same event-loop turn
  // as the real page mount, when the DOM is already committed; the backend fallback timeout still
  // guarantees the window is shown even if the frontend misbehaves.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void revealWindow().catch((error) => {
        console.error("[WindowReveal] reveal window failed:", error);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}
