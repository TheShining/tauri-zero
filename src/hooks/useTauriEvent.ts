import { useEffect, useRef } from "react";
import { listen, type Event } from "@tauri-apps/api/event";
import type { AppEventName, AppEventPayloadMap } from "../api/ipc/events";

/**
 * 订阅全局 Tauri 事件的统一 hook。
 * - handler 通过 ref 引用最新闭包，handler 身份变化不会触发反复订阅/退订；
 * - 清理采用 promise-then-cleanup 模式：组件在 listen() resolve 之前卸载时，
 *   unlisten 会被推迟到 promise 完成后立即执行，监听器不会泄漏。
 * A unified hook for subscribing to global Tauri events.
 * - The handler is referenced through a ref holding the latest closure, so changes in
 *   handler identity never cause re-subscription churn.
 * - Cleanup follows the promise-then-cleanup pattern: when the component unmounts before
 *   listen() resolves, the unlisten call is deferred until the promise settles, so the
 *   listener never leaks.
 */
export function useTauriEvent<E extends AppEventName>(
  event: E,
  handler: (event: Event<AppEventPayloadMap[E]>) => void,
): void {
  const handlerRef = useRef(handler);

  // 渲染提交后再同步 ref，遵循 React Compiler 对渲染期 ref 写入的限制。
  // Sync the ref after render commits, respecting the React Compiler rule that forbids
  // writing to refs during render.
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const unlistenPromise = listen(event, (e) =>
      handlerRef.current(e as Event<AppEventPayloadMap[E]>),
    );
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [event]);
}
