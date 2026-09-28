import { describe, expect, it } from "vitest";
import { createAppRouter } from "./createAppRouter";

describe("app router", () => {
  it("uses hash history for desktop routes", () => {
    const router = createAppRouter();

    expect(router.state.location.pathname).toBe("/");
    expect(router.state.location.search).toBe("");
    expect(router.state.location.hash).toBe("");
  });

  it("defines standalone window routes for settings and the note editor", () => {
    const router = createAppRouter();
    const standalone = router.routes.filter((route) => route.path?.startsWith("/"));

    expect(standalone.some((route) => route.path === "/settings")).toBe(true);
    expect(standalone.some((route) => route.path === "/notes/:contextId")).toBe(true);
  });
});
