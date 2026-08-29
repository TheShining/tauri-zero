import { httpFetch } from "./client";
import type {
  ApiResponse,
  ErrorInterceptor,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from "./types";
import { useUserStore } from "../stores/useUserStore";

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

// 默认请求拦截器：注入 token
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

export async function request<T = unknown>(url: string, config: RequestConfig = {}): Promise<T> {
  let finalConfig: RequestConfig = {
    baseURL: import.meta.env.VITE_API_BASE_URL,
    ...config,
  };
  for (const interceptor of requestInterceptors) {
    finalConfig = await interceptor(finalConfig);
  }

  let response: Response;
  try {
    response = await httpFetch(url, finalConfig);
  } catch (error) {
    for (const interceptor of errorInterceptors) interceptor(error);
    throw error;
  }

  for (const interceptor of responseInterceptors) {
    response = await interceptor(response);
  }

  if (!response.ok) {
    const error = new ApiError(response.status, `HTTP ${response.status}`);
    for (const interceptor of errorInterceptors) interceptor(error);
    throw error;
  }

  const result = (await response.json()) as ApiResponse<T>;
  if (result.code !== 0) {
    const error = new ApiError(result.code, result.message);
    for (const interceptor of errorInterceptors) interceptor(error);
    throw error;
  }

  return result.data;
}
