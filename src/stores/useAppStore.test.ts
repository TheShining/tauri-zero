import { beforeEach, describe, expect, it, vi } from "vitest";

// 直接 mock IPC 模块与反馈组件：store 测试只关心同步/回滚逻辑，不触达 Tauri 运行时与 antd DOM。
// Mock the IPC module and the feedback component directly: store tests only care about
// sync/rollback logic and must not touch the Tauri runtime or antd DOM rendering.
vi.mock("../api/ipc/modules/app", () => ({
  setCloseToTray: vi.fn(),
}));
vi.mock("../components/AppFeedback", () => ({
  feedback: { success: vi.fn(), error: vi.fn(), info: vi.fn(), notify: vi.fn() },
}));

import { setCloseToTray } from "../api/ipc/modules/app";
import { useAppStore } from "./useAppStore";

const setCloseToTrayMock = vi.mocked(setCloseToTray);

describe("useAppStore.setCloseToTray", () => {
  beforeEach(() => {
    setCloseToTrayMock.mockReset();
    useAppStore.setState({ closeToTray: true });
  });

  // 后端同步成功：开关保持新值。
  // Backend sync succeeds: the switch keeps the new value.
  it("keeps the new value when sync succeeds", async () => {
    setCloseToTrayMock.mockResolvedValue(undefined);

    useAppStore.getState().setCloseToTray(false);

    expect(useAppStore.getState().closeToTray).toBe(false);
    await vi.waitFor(() => expect(setCloseToTrayMock).toHaveBeenCalledWith(false));
    expect(useAppStore.getState().closeToTray).toBe(false);
  });

  // 后端同步失败：开关回滚到旧值并提示用户。
  // Backend sync fails: the switch rolls back to the previous value and notifies the user.
  it("rolls back to the previous value when sync fails", async () => {
    setCloseToTrayMock.mockRejectedValue(new Error("ipc down"));
    const { feedback } = await import("../components/AppFeedback");

    useAppStore.getState().setCloseToTray(false);

    expect(useAppStore.getState().closeToTray).toBe(false);
    await vi.waitFor(() => expect(useAppStore.getState().closeToTray).toBe(true));
    await vi.waitFor(() => expect(vi.mocked(feedback.error)).toHaveBeenCalled());
  });
});
