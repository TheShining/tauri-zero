import { describe, expect, it } from "vitest";
import { useUserStore } from "./useUserStore";

interface PersistedUserStore {
  state: { user?: unknown; token?: unknown };
}

describe("useUserStore persistence", () => {
  // token 为敏感凭证：set 之后 localStorage 中只允许出现 user，绝不允许出现 token；
  // 应用冷启动时持久化数据中没有 token，自然只能重新认证获取。
  // The token is a sensitive credential: after a set, localStorage may contain the user
  // but must never contain the token. With no token in the persisted data, a cold-started
  // app naturally has to re-authenticate to obtain one.
  it("persists user info but never the token", () => {
    useUserStore.getState().setUser({ id: "u-1", name: "Alice" });
    useUserStore.getState().setToken("secret-token");

    // zustand persist 默认同步写入 localStorage。
    // zustand persist writes synchronously to localStorage by default.
    const raw = window.localStorage.getItem("user-store");
    expect(raw).not.toBeNull();

    const persisted = JSON.parse(raw as string) as PersistedUserStore;
    expect(persisted.state.user).toEqual({ id: "u-1", name: "Alice" });
    expect(persisted.state).not.toHaveProperty("token");
    expect(raw).not.toContain("secret-token");
  });

  it("clears user and token on logout", () => {
    useUserStore.getState().setUser({ id: "u-1", name: "Alice" });
    useUserStore.getState().setToken("secret-token");

    useUserStore.getState().logout();

    expect(useUserStore.getState().user).toBeNull();
    expect(useUserStore.getState().token).toBeNull();
  });
});
