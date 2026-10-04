import { describe, expect, it } from "vitest";
import { loadArticle } from "./article";
import { canaryNames } from "./canary";

describe("canary fixtures", () => {
  it("has at least one canary", () => {
    expect(canaryNames().length).toBeGreaterThan(0);
  });

  it.each(canaryNames())("%s is large enough to render as a real article, not a stub", (name) => {
    const loaded = loadArticle(`content/dsa/${name}.md`, `tests/fixtures/canary/${name}.md`);
    expect(loaded.isStub).toBe(false);
  });
});
