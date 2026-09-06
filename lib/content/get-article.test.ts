import { describe, expect, it } from "vitest";
import { getArticle, getArticleSlugs } from "./index";

describe("getArticleSlugs", () => {
  it("covers every discovered article across both verticals", () => {
    const slugs = getArticleSlugs();
    expect(slugs.length).toBeGreaterThan(150);
    expect(slugs).toContainEqual({ vertical: "dsa", slug: ["patterns", "sliding-window"] });
  });
});

describe("getArticle", () => {
  it("returns a complete Article for a real path", async () => {
    const a = await getArticle("dsa", ["patterns", "sliding-window"]);
    expect(a).toBeDefined();
    expect(a!.path).toBe("content/dsa/patterns/sliding-window.md");
    expect(a!.verticalId).toBe("dsa");
    expect(a!.title).toBeTruthy();
    expect(a!.html).toContain("<");
    expect(a!.headings.length).toBeGreaterThan(0);
    expect(a!.headings[0]!.depth).toBeGreaterThanOrEqual(2);
    expect(a!.excerpt.length).toBeGreaterThan(0);
    expect(a!.byteSize).toBeGreaterThan(0);
    expect(typeof a!.isStub).toBe("boolean");
    expect(a!.shapeFingerprint).toHaveProperty("headings");
    expect(a!.shapeFingerprint).toHaveProperty("codeBlocks");
    expect(typeof a!.readingTimeMin).toBe("number");
  });

  it("reports readingTimeMin 0 for a stub", async () => {
    const a = await getArticle("dsa", ["patterns", "cyclic-sort"]);
    expect(a).toBeDefined();
    expect(a!.isStub).toBe(true);
    expect(a!.readingTimeMin).toBe(0);
  });

  it("returns undefined for an unknown slug", async () => {
    expect(await getArticle("dsa", ["nope", "nothing"])).toBeUndefined();
  });

  it("returns undefined for an unknown vertical", async () => {
    expect(await getArticle("made-up", ["x"])).toBeUndefined();
  });

  it("memoizes: same object reference on repeat calls", async () => {
    const a = await getArticle("dsa", ["patterns", "sliding-window"]);
    const b = await getArticle("dsa", ["patterns", "sliding-window"]);
    expect(a).toBe(b);
  });
});
