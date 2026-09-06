import { describe, expect, it } from "vitest";
import { buildBacklinks, getBacklinks, getRelated } from "./backlinks";
import { buildSearchIndex } from "./search-index";

describe("buildBacklinks", () => {
  it("inverts internal links into a target -> sources map, keys sorted", () => {
    const bl = buildBacklinks(buildSearchIndex());
    const keys = Object.keys(bl);
    expect(keys.length).toBeGreaterThan(50);
    expect([...keys]).toEqual([...keys].sort());
    expect(keys.every((k) => k.startsWith("./content/"))).toBe(true);
  });
});

describe("getBacklinks", () => {
  it("returns fromPath/fromTitle/fromVerticalId for a linked article", () => {
    const refs = getBacklinks("content/dsa/algorithms/aho-corasick.md");
    expect(refs.length).toBeGreaterThan(0);
    expect(refs[0]!.fromPath.startsWith("content/")).toBe(true);
    expect(refs[0]!.fromTitle).toBeTruthy();
    expect(["dsa", "system-design"]).toContain(refs[0]!.fromVerticalId);
  });

  it("returns an empty array for an article nothing links to", () => {
    expect(getBacklinks("content/dsa/nope/does-not-exist.md")).toEqual([]);
  });
});

describe("getRelated", () => {
  it("ranks same-section siblings, at most 3", () => {
    const related = getRelated("dsa", ["patterns", "sliding-window"]);
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(3);
    expect(related.every((r) => Array.isArray(r.slug))).toBe(true);
    expect(related.some((r) => r.slug.join("/") === "patterns/sliding-window")).toBe(false);
  });

  it("returns an empty array for an unknown article", () => {
    expect(getRelated("dsa", ["nope"])).toEqual([]);
  });
});
