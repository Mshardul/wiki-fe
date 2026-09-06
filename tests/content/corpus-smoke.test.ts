import { describe, it, expect } from "vitest";
import { getArticleSlugs, getArticle } from "../../lib/content/index";
import { buildManifest } from "../../lib/content/manifest";
import { manifestSchema } from "../../lib/content/manifest.schema";

describe("corpus smoke", () => {
  it("renders every article without throwing", async () => {
    const failures: string[] = [];
    for (const { vertical, slug } of getArticleSlugs()) {
      try {
        const a = await getArticle(vertical, slug);
        if (!a || !a.html) failures.push(`${vertical}/${slug.join("/")}`);
      } catch (e) {
        failures.push(`${vertical}/${slug.join("/")}: ${(e as Error).message}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("produces a schema-valid manifest", async () => {
    const manifest = await buildManifest();
    expect(() => manifestSchema.parse(manifest)).not.toThrow();
  });

  it("every rendered article satisfies the Article contract", async () => {
    for (const { vertical, slug } of getArticleSlugs()) {
      const a = await getArticle(vertical, slug);
      expect(a, `${vertical}/${slug.join("/")}`).toBeDefined();
      expect(typeof a!.title).toBe("string");
      expect(a!.title.length).toBeGreaterThan(0);
      expect(Array.isArray(a!.headings)).toBe(true);
      expect(a!.shapeFingerprint).toHaveProperty("headings");
      expect(typeof a!.readingTimeMin).toBe("number");
      expect(a!.isStub ? a!.readingTimeMin === 0 : true).toBe(true);
    }
  });
});
