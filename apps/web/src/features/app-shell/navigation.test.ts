import { describe, expect, it } from "vite-plus/test";

import { BASE_NAVIGATION_ITEMS, resolveBaseNavigationItem } from "./navigation";

describe("Base primary navigation", () => {
  it("exposes the eight product destinations in the specified order", () => {
    expect(BASE_NAVIGATION_ITEMS.map(({ id, to }) => [id, to])).toEqual([
      ["inbox", "/inbox"],
      ["issues", "/issues"],
      ["board", "/board"],
      ["workflows", "/workflows"],
      ["runs", "/runs"],
      ["agents", "/agents"],
      ["repository", "/repository"],
      ["settings", "/settings"],
    ]);
  });

  it("keeps nested product routes attached to their primary destination", () => {
    expect(resolveBaseNavigationItem("/issues/BAS-101")?.id).toBe("issues");
    expect(resolveBaseNavigationItem("/workflows/reliable-feature-delivery")?.id).toBe("workflows");
    expect(resolveBaseNavigationItem("/settings/providers")?.id).toBe("settings");
  });

  it("maps existing agent workspace routes to Agents", () => {
    expect(resolveBaseNavigationItem("/")?.id).toBe("agents");
    expect(resolveBaseNavigationItem("/draft/draft-1")?.id).toBe("agents");
    expect(resolveBaseNavigationItem("/local/thread-1")?.id).toBe("agents");
  });

  it("does not claim unauthenticated or unknown routes", () => {
    expect(resolveBaseNavigationItem("/pair")).toBeNull();
    expect(resolveBaseNavigationItem("/unknown")).toBeNull();
  });
});
