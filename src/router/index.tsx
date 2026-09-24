import { RouterProvider } from "react-router";
import { Spin } from "antd";
import { Suspense } from "react";
import WindowReveal from "../components/WindowReveal";
import { createAppRouter } from "./createAppRouter";

// 懒加载路由解析期间的兜底占位：整窗居中的加载动画，而不是左上角裸文本。
// WindowReveal 与 RouterProvider 同为 Suspense 子节点：挂起期间二者都被替换为兜底内容，
// 解析完成后 WindowReveal 才挂载并触发窗口显示，白屏与 Loading 文案都不会被看见。
// Placeholder shown while lazy routes resolve: a loading spinner centered in the window instead of
// bare top-left text. WindowReveal sits next to RouterProvider as a Suspense child: while suspended,
// both are replaced by the fallback; once resolved, WindowReveal mounts and reveals the window, so
// neither the white flash nor the loading text is ever visible.
const suspenseFallback = (
  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Spin />
  </div>
);

export default function AppRouter() {
  return (
    <Suspense fallback={suspenseFallback}>
      <WindowReveal />
      <RouterProvider router={createAppRouter()} />
    </Suspense>
  );
}
