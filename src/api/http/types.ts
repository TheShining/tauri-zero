export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
// 允许同步或异步实现；request 层会 await 每个拦截器。
// Both sync and async implementations are allowed; the request layer awaits each interceptor.
export type ErrorInterceptor = (error: unknown) => void | Promise<void>;

export interface RequestConfig extends Omit<RequestInit, "body"> {
  baseURL?: string;
  timeout?: number;
  body?: BodyInit | Record<string, unknown>;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
  skipErrorHandler?: boolean;
}
