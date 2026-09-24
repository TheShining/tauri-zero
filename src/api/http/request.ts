import { httpFetch } from "./client";
import type {
  ApiResponse,
  ErrorInterceptor,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from "./types";
import { useUserStore } from "../../stores/useUserStore";
import { feedback } from "../../utils/feedback";
import i18n from "../../app/i18n";

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const errorInterceptors: ErrorInterceptor[] = [];

export function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor);
}
export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor);
}
export function addErrorInterceptor(interceptor: ErrorInterceptor) {
  errorInterceptors.push(interceptor);
}

// 默认请求拦截器，注入 token。
// Default request interceptor that injects the token.
addRequestInterceptor((config) => {
  const token = useUserStore.getState().token;
  if (token && !config.skipAuth) {
    config.headers = {
      ...(config.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

// 依次执行错误拦截器；单个请求可凭 skipErrorHandler 跳过统一错误提示。
// Run error interceptors in order; a single request can opt out of the shared
// error handling via skipErrorHandler.
async function runErrorInterceptors(error: unknown, config: RequestConfig) {
  if (config.skipErrorHandler) return;
  for (const interceptor of errorInterceptors) {
    await interceptor(error);
  }
}

// 默认错误拦截器：把请求失败统一转成用户可见的 message 提示。
// 注册在模块加载时，先于业务方注册的拦截器执行。
// Default error interceptor: turns request failures into a user-visible message.
// Registered at module load, so it runs before interceptors added by business code.
addErrorInterceptor((error) => {
  const content =
    error instanceof ApiError
      ? i18n.t("http.requestFailed", { message: error.message })
      : i18n.t("http.networkError");
  feedback.error(content);
});

export async function request<T = unknown>(url: string, config: RequestConfig = {}): Promise<T> {
  let finalConfig: RequestConfig = {
    baseURL: import.meta.env.APP_PUBLIC_API_BASE_URL,
    ...config,
  };
  for (const interceptor of requestInterceptors) {
    finalConfig = await interceptor(finalConfig);
  }

  let response: Response;
  try {
    response = await httpFetch(url, finalConfig);
  } catch (error) {
    await runErrorInterceptors(error, finalConfig);
    throw error;
  }

  for (const interceptor of responseInterceptors) {
    response = await interceptor(response);
  }

  if (!response.ok) {
    const error = new ApiError(response.status, `HTTP ${response.status}`);
    await runErrorInterceptors(error, finalConfig);
    throw error;
  }

  // 204 No Content 没有响应体，直接返回空值，避免对空响应做 JSON 解析。
  // A 204 No Content response has no body; return undefined instead of
  // attempting JSON parsing on an empty response.
  if (response.status === 204) {
    return undefined as T;
  }

  // 只允许 JSON 响应：非 JSON（二进制/纯文本/空 content-type）一律视为协议外响应，
  // 直接抛 ApiError，而不是让 JSON 解析器抛难以定位的 SyntaxError。
  // Only JSON responses are accepted: treat any non-JSON payload (binary, plain text,
  // missing content-type) as an out-of-contract response by throwing ApiError instead of
  // letting the JSON parser throw a hard-to-trace SyntaxError.
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const error = new ApiError(
      response.status,
      `Unexpected response content-type: ${contentType || "unknown"}`,
    );
    await runErrorInterceptors(error, finalConfig);
    throw error;
  }

  const result = (await response.json()) as ApiResponse<T>;
  if (result.code !== 0) {
    const error = new ApiError(result.code, result.message);
    await runErrorInterceptors(error, finalConfig);
    throw error;
  }

  return result.data;
}
