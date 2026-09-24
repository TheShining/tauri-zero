import { beforeEach, describe, expect, it, vi } from "vitest";

// mock 底层 fetch 与反馈组件：request 层测试只验证拦截器链、错误语义与协议假设。
// Mock the low-level fetch and the feedback component: request-layer tests only verify
// the interceptor chain, error semantics and protocol assumptions.
vi.mock("./client", () => ({
  httpFetch: vi.fn(),
}));
vi.mock("../../utils/feedback", () => ({
  feedback: { success: vi.fn(), error: vi.fn(), info: vi.fn(), notify: vi.fn() },
}));

import { httpFetch } from "./client";
import { feedback } from "../../utils/feedback";
import { addErrorInterceptor, ApiError, addRequestInterceptor, request } from "./request";
import { useUserStore } from "../../stores/useUserStore";

const httpFetchMock = vi.mocked(httpFetch);
const feedbackErrorMock = vi.mocked(feedback.error);

function jsonResponse(init: { status?: number; body?: unknown; contentType?: string } = {}) {
  const {
    status = 200,
    body = { code: 0, message: "ok", data: null },
    contentType = "application/json",
  } = init;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  });
}

describe("http request", () => {
  beforeEach(() => {
    httpFetchMock.mockReset();
    feedbackErrorMock.mockReset();
    useUserStore.setState({ user: null, token: null });
  });

  // 正常链路：code === 0 时返回 data。
  // Happy path: returns data when code === 0.
  it("returns data for a successful ApiResponse", async () => {
    httpFetchMock.mockResolvedValue(
      jsonResponse({ body: { code: 0, message: "ok", data: { id: "1" } } }),
    );

    const data = await request<{ id: string }>("/user");

    expect(data).toEqual({ id: "1" });
    expect(feedbackErrorMock).not.toHaveBeenCalled();
  });

  // 登录后自动注入 Authorization；skipAuth 可关闭。
  // Authorization is injected automatically after login; skipAuth disables it.
  it("injects the token and honors skipAuth", async () => {
    useUserStore.setState({ user: null, token: "tok-1" });
    httpFetchMock.mockResolvedValue(jsonResponse());

    await request("/a");

    expect(httpFetchMock).toHaveBeenCalledWith(
      "/a",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok-1" }) as unknown,
      }),
    );

    httpFetchMock.mockResolvedValue(jsonResponse());
    await request("/b", { skipAuth: true });
    // httpFetch mock 的参数类型即 RequestConfig。/ The httpFetch mock argument is typed as RequestConfig.
    const secondConfig = httpFetchMock.mock.calls[1][1];
    expect(secondConfig.headers).toBeUndefined();
  });

  // HTTP 状态码非 2xx：抛 ApiError 并弹统一错误提示。
  // Non-2xx HTTP status: throws ApiError and shows the shared error feedback.
  it("throws ApiError and notifies on HTTP errors", async () => {
    httpFetchMock.mockResolvedValue(jsonResponse({ status: 500 }));

    await expect(request("/boom")).rejects.toMatchObject({ code: 500, message: "HTTP 500" });
    expect(feedbackErrorMock).toHaveBeenCalledTimes(1);
  });

  // 业务错误码 code !== 0：抛 ApiError，message 透传后端文案。
  // Business error code (code !== 0): throws ApiError with the backend message passed through.
  it("throws ApiError for non-zero business codes", async () => {
    httpFetchMock.mockResolvedValue(
      jsonResponse({ body: { code: 40001, message: "no permission", data: null } }),
    );

    const error = await request("/biz").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 40001, message: "no permission" });
  });

  // skipErrorHandler：错误仍抛出，但统一提示被跳过。
  // skipErrorHandler: the error still throws, but the shared feedback is skipped.
  it("skips the shared feedback when skipErrorHandler is set", async () => {
    httpFetchMock.mockResolvedValue(jsonResponse({ status: 403 }));

    await expect(request("/secret", { skipErrorHandler: true })).rejects.toBeInstanceOf(ApiError);
    expect(feedbackErrorMock).not.toHaveBeenCalled();
  });

  // 204 No Content：直接返回 undefined，不做 JSON 解析。
  // 204 No Content: returns undefined without JSON parsing.
  it("returns undefined for 204 responses", async () => {
    httpFetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(request("/nothing")).resolves.toBeUndefined();
  });

  // 非 JSON 响应：抛 ApiError 而不是 SyntaxError。
  // Non-JSON response: throws ApiError instead of a SyntaxError.
  it("rejects non-JSON responses with ApiError", async () => {
    httpFetchMock.mockResolvedValue(
      new Response("<html/>", { status: 200, headers: { "content-type": "text/html" } }),
    );

    await expect(request("/html")).rejects.toMatchObject({ name: "ApiError" });
  });

  // 网络层异常：透传原始错误并触发统一提示（networkError 文案）。
  // Transport-level failure: the original error is rethrown and shared feedback fires.
  it("propagates network errors and notifies", async () => {
    httpFetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(request("/down")).rejects.toThrow("fetch failed");
    expect(feedbackErrorMock).toHaveBeenCalledTimes(1);
  });

  // 自定义错误拦截器会被 await，并在默认提示之后执行。
  // Custom error interceptors are awaited and run after the default feedback.
  it("awaits custom error interceptors after the default one", async () => {
    const order: string[] = [];
    // antd message.error 返回 MessageType（关闭句柄），测试中无需真实返回值，做一次类型收窄。
    // antd message.error returns a MessageType close handle; tests do not need a real
    // return value, so narrow the type here.
    feedbackErrorMock.mockImplementation((() => {
      order.push("default");
      return undefined;
    }) as unknown as typeof feedback.error);
    addErrorInterceptor(async () => {
      await Promise.resolve();
      order.push("custom");
    });
    httpFetchMock.mockResolvedValue(jsonResponse({ status: 500 }));

    await expect(request("/order")).rejects.toBeInstanceOf(ApiError);
    expect(order).toEqual(["default", "custom"]);
  });

  // 请求拦截器按注册顺序链式修改配置。
  // Request interceptors chain-modify the config in registration order.
  it("chains request interceptors", async () => {
    addRequestInterceptor((config) => ({
      ...config,
      headers: { ...(config.headers as Record<string, string>), "X-Trace": "t-1" },
    }));
    httpFetchMock.mockResolvedValue(jsonResponse());

    await request("/traced");

    expect(httpFetchMock).toHaveBeenCalledWith(
      "/traced",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Trace": "t-1" }) as unknown,
      }),
    );
  });
});
