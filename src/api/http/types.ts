export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
export type ErrorInterceptor = (error: unknown) => unknown;

export interface RequestConfig extends Omit<RequestInit, "body"> {
  baseURL?: string;
  timeout?: number;
  body?: BodyInit | Record<string, unknown>;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
  skipErrorHandler?: boolean;
}
