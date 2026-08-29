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

  try {
    return await tauriFetch(urlObj.toString(), {
      ...rest,
      headers: headers as Record<string, string>,
      body: finalBody,
      signal: controller.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
