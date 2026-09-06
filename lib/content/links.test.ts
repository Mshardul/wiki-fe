import { describe, expect, it } from "vitest";
import { extractLinks, resolveLink, validateLinks } from "./links";

describe("resolveLink", () => {
  it("resolves ../ and ./ against the base dir", () => {
    expect(resolveLink("content/dsa/patterns", "../data-structures/stack.md")).toBe(
      "content/dsa/data-structures/stack.md",
    );
    expect(resolveLink("content/dsa/patterns", "./sliding-window.md")).toBe(
      "content/dsa/patterns/sliding-window.md",
    );
  });
});

describe("extractLinks", () => {
  it("pulls .md targets, strips fragments, dedupes, drops self-links", () => {
    const md = [
      "[A](./a.md)",
      "[B](../x/b.md#section)",
      "[A again](./a.md)",
      "[self](./self.md)",
      "[external](https://example.com)",
    ].join("\n\n");
    const links = extractLinks("content/dsa/patterns/self.md", md);
    expect(links.map((l) => l.target)).toEqual(["content/dsa/patterns/a.md", "content/dsa/x/b.md"]);
    expect(links[1]!.fragment).toBe("section");
  });
});

describe("validateLinks", () => {
  const SRC = "lib/content/fixtures/links-source.md";
  const TARGET = "lib/content/fixtures/links-target.md";
  const heads = new Map<string, Set<string>>([[TARGET, new Set(["known-heading"])]]);

  it("flags the missing target and the bad anchor, passes the good link", () => {
    const errs = validateLinks([SRC, TARGET], heads);
    expect(errs).toContainEqual(
      expect.objectContaining({
        target: `${TARGET.replace(/[^/]+$/, "")}links-missing.md`,
        reason: "missing-target",
      }),
    );
    expect(errs).toContainEqual(
      expect.objectContaining({
        target: TARGET,
        reason: "missing-anchor",
        anchor: "no-such-heading",
      }),
    );
    expect(errs.some((e) => e.reason === "missing-anchor" && e.anchor === "known-heading")).toBe(
      false,
    );
  });

  it("returns no errors when every link resolves", () => {
    const errs = validateLinks([TARGET], heads);
    expect(errs).toEqual([]);
  });

  it("does not flag a link to a real non-article file that exists on disk", () => {
    // links-target.md exists on disk but is passed as not-a-known-article here
    const errs = validateLinks([SRC], heads);
    expect(errs.some((e) => e.target === TARGET && e.reason === "missing-target")).toBe(false);
  });
});
