import { describe, expect, it } from "vitest";
import { createAppRouter } from "./createAppRouter";

describe("app router", () => {
  it("uses hash history for desktop routes", () => {
    const router = createAppRouter();

    expect(router.state.location.pathname).toBe("/");
    expect(router.state.location.search).toBe("");
    expect(router.state.location.hash).toBe("");
  });

  it("defines a settings child route", () => {
    const router = createAppRouter();
    const routes = router.routes[0].children ?? [];

    expect(routes.some((route) => route.path === "settings")).toBe(true);
  });
});
