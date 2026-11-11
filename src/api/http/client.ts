import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { RequestConfig } from "./types";

export async function httpFetch<T>(
  url: string,
  config: RequestConfig,
  consume: (response: Response) => Promise<T>,
): Promise<T> {
  const { baseURL, timeout = 20_000, params, body, headers, ...rest } = config;

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
  const timer = timeout
    ? setTimeout(
        () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
        timeout,
      )
    : undefined;

  // 调用方取消和超时共用同一控制器。Forward caller cancellation and timeout into the same controller.
  const outerSignal = rest.signal;
  const onOuterAbort = () => controller.abort(outerSignal?.reason);
  if (outerSignal) {
    if (outerSignal.aborted) {
      controller.abort(outerSignal.reason);
    } else {
      outerSignal.addEventListener("abort", onOuterAbort, { once: true });
    }
  }

  let response: Response | undefined;
  try {
    controller.signal.throwIfAborted();
    response = await tauriFetch(urlObj.toString(), {
      ...rest,
      headers,
      body: finalBody,
      signal: controller.signal,
    });
    // 响应体读取也属于请求生命周期，完成后才释放取消监听与定时器。Keep cancellation and timeout active until response consumption finishes.
    const result = await consume(response);
    controller.signal.throwIfAborted();
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onOuterAbort);
    if (response?.body && !response.bodyUsed) {
      void response.body.cancel().catch(() => {});
    }
  }
}
