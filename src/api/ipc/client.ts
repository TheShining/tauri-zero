import { invoke } from "@tauri-apps/api/core";

const APP_IPC_ERROR_KINDS = [
  "not_found",
  "invalid_input",
  "internal",
  "database",
  "config",
  "unauthorized",
] as const;

const APP_IPC_ERROR_CODES = {
  not_found: "NOT_FOUND",
  invalid_input: "INVALID_INPUT",
  internal: "INTERNAL",
  database: "DATABASE",
  config: "CONFIG",
  unauthorized: "UNAUTHORIZED",
} as const;

export type AppIpcErrorKind = (typeof APP_IPC_ERROR_KINDS)[number];

export interface AppIpcErrorFields {
  readonly kind: AppIpcErrorKind;
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
}

export type AppIpcErrorPayload = Pick<AppIpcErrorFields, "kind" | "code" | "message">;

export class AppIpcError extends Error implements AppIpcErrorFields {
  readonly kind: AppIpcErrorKind;
  readonly code: string;
  readonly cause?: unknown;

  constructor(fields: AppIpcErrorFields) {
    super(fields.message);
    this.name = "AppIpcError";
    this.kind = fields.kind;
    this.code = fields.code;
    this.cause = fields.cause;
  }
}

export function isAppIpcError(error: unknown): error is AppIpcError {
  return error instanceof AppIpcError;
}

export function isAppIpcErrorPayload(error: unknown): error is AppIpcErrorPayload {
  return (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    typeof (error as { kind?: unknown }).kind === "string" &&
    (APP_IPC_ERROR_KINDS as readonly string[]).includes((error as { kind: string }).kind) &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

function unknownErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Tauri IPC call failed";
}

export function toAppIpcError(error: unknown): AppIpcError {
  if (isAppIpcError(error)) return error;
  if (isAppIpcErrorPayload(error)) return new AppIpcError(error);
  return new AppIpcError({
    kind: "internal",
    code: APP_IPC_ERROR_CODES.internal,
    message: unknownErrorMessage(error),
    cause: error,
  });
}

export async function ipcInvoke<T = unknown>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw toAppIpcError(error);
  }
}
