import { describe, expect, it } from "vitest";
import { getManifest } from "./manifest";
import { buildPreviews } from "./previews";

describe("buildPreviews", () => {
  it("has an entry for every non-stub article, keyed vertical/slug", async () => {
    const manifest = await getManifest();
    const previews = buildPreviews(manifest);
    const nonStub = manifest.articles.filter((a) => !a.isStub);
    expect(Object.keys(previews).length).toBe(nonStub.length);
    for (const a of nonStub) {
      const entry = previews[`${a.verticalId}/${a.slug.join("/")}`];
      expect(entry).toBeDefined();
      expect(entry!.title).toBeTruthy();
      expect(typeof entry!.excerpt).toBe("string");
      expect(entry!.excerpt).not.toMatch(/<[a-z]/i);
    }
  });

  it("omits stubs", async () => {
    const manifest = await getManifest();
    const previews = buildPreviews(manifest);
    for (const a of manifest.articles.filter((x) => x.isStub)) {
      expect(previews[`${a.verticalId}/${a.slug.join("/")}`]).toBeUndefined();
    }
  });
});
