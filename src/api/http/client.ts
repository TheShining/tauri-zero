import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { RequestConfig } from "./types";

export async function httpFetch(url: string, config: RequestConfig): Promise<Response> {
  const { baseURL, timeout, params, body, headers, ...rest } = config;

  const fullUrl = baseURL ? `${baseURL}${url}` : url;
  const urlObj = new URL(fullUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) urlObj.searchParams.set(key, String(value));
    }
  }

  let finalBody: BodyInit | undefined;
  if (body !== undefined) {
    if (
      typeof body === "string" ||
      body instanceof FormData ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      body instanceof URLSearchParams
    ) {
      finalBody = body as BodyInit;
    } else {
      finalBody = JSON.stringify(body);
    }
  }

  const controller = new AbortController();
  const timer = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;

  // 合并调用方的取消信号：原实现里 controller.signal 会静默覆盖 rest.signal，
  // 导致调用方传入的 signal（如路由切换时取消请求）完全不生效。
  // Merge the caller's abort signal: previously controller.signal silently overrode
  // rest.signal, so a caller-provided signal (e.g. cancelling requests on route change)
  // had no effect at all.
  const outerSignal = rest.signal;
  const onOuterAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) {
      controller.abort();
    } else {
      outerSignal.addEventListener("abort", onOuterAbort, { once: true });
    }
  }

  try {
    return await tauriFetch(urlObj.toString(), {
      ...rest,
      headers: headers as Record<string, string>,
      body: finalBody,
      signal: controller.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
    // 请求结束后移除监听（once 只在触发后自动移除），避免长生命周期外部 signal 上的监听器持续累积。
    // Remove the listener after the request settles (once only auto-removes after firing),
    // avoiding listener accumulation on long-lived external signals.
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
}
