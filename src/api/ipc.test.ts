import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { AppIpcError, isAppIpcError, isAppIpcErrorPayload, ipcInvoke, toAppIpcError } from "./ipc";

const invokeMock = vi.mocked(invoke);

describe("ipc", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("returns the command result", async () => {
    invokeMock.mockResolvedValue("ok");
    await expect(ipcInvoke<string>("read_text_file", { path: "/tmp/a.txt" })).resolves.toBe("ok");
  });

  it("normalizes backend AppError payloads", async () => {
    const payload = {
      kind: "invalid_input",
      code: "INVALID_INPUT",
      message: "title is empty",
    };
    invokeMock.mockRejectedValue(payload);

    const error = await ipcInvoke<void>("create_note").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppIpcError);
    expect(isAppIpcError(error)).toBe(true);
    expect(error).toMatchObject(payload);
  });

  it("wraps unexpected IPC errors", async () => {
    const original = new Error("unknown transport failure");
    invokeMock.mockRejectedValue(original);

    const error = await ipcInvoke<void>("missing_command").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppIpcError);
    expect(error).toMatchObject({
      kind: "internal",
      code: "INTERNAL",
      message: "unknown transport failure",
      cause: original,
    });
  });

  it("keeps raw payloads recognizable", () => {
    const payload = {
      kind: "database",
      code: "DATABASE",
      message: "connection refused",
    };

    expect(isAppIpcErrorPayload(payload)).toBe(true);
    expect(isAppIpcError(payload)).toBe(false);
    expect(toAppIpcError(payload)).toMatchObject(payload);
  });
});
