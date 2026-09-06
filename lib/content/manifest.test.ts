import { describe, expect, it } from "vitest";
import { buildManifest } from "./manifest";

describe("buildManifest", () => {
  it("includes every discovered article", async () => {
    const m = await buildManifest();
    expect(m.articles.length).toBeGreaterThan(150);
  });

  it("omits html from manifest articles", async () => {
    const m = await buildManifest();
    expect((m.articles[0] as Record<string, unknown>).html).toBeUndefined();
  });

  it("derives articleCount per vertical as the total discovered count", async () => {
    const m = await buildManifest();
    for (const v of m.verticals) {
      const inVertical = m.articles.filter((a) => a.verticalId === v.id).length;
      expect(v.articleCount).toBe(inVertical);
      expect(v.articleCount).toBeGreaterThan(0);
    }
  });

  it("every article has a heading tree, excerpt and fingerprint", async () => {
    const m = await buildManifest();
    for (const a of m.articles) {
      expect(Array.isArray(a.headings)).toBe(true);
      expect(typeof a.excerpt).toBe("string");
      expect(a.shapeFingerprint).toHaveProperty("headings");
    }
  });

  it("stamps generatedAt as an ISO string", async () => {
    const m = await buildManifest();
    expect(() => new Date(m.generatedAt).toISOString()).not.toThrow();
    expect(m.generatedAt).toBe(new Date(m.generatedAt).toISOString());
  });
});
