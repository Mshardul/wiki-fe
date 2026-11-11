import { describe, expect, it } from "vitest";
import { MODULES } from "../modules";
import { VISUALIZERS } from "../registry";
import { mechanismArticleHref } from "./links";
import { MECHANISM_MANIFEST, mechanismKeyForRouteSlug } from "./manifest";

function scenarioOptionCount(slug: string): number {
  const mod = MODULES[slug];
  if (!mod) return 0;
  const key = mod.variants?.key ?? "scenario";
  for (const section of mod.sections) {
    for (const field of section.fields) {
      if (field.key === key && field.kind === "chips") return field.options.length;
    }
  }
  return 0;
}

describe("mechanism manifest", () => {
  const mechanismSlugs = VISUALIZERS.filter((v) => v.kind === "mechanism").map((v) => v.slug);

  it("lists every registered mechanism slug and no extras", () => {
    expect(Object.keys(MECHANISM_MANIFEST.slugs).sort()).toEqual([...mechanismSlugs].sort());
  });

  it("matches scenario chips and Read article expectations", () => {
    for (const slug of mechanismSlugs) {
      const row = MECHANISM_MANIFEST.slugs[slug];
      expect(row, slug).toBeDefined();
      expect(scenarioOptionCount(slug), slug).toBe(row!.scenarioCount);
      const key = mechanismKeyForRouteSlug(slug);
      expect(key, slug).toBeDefined();
      const href = mechanismArticleHref(key!);
      expect(href !== "", slug).toBe(row!.expectReadArticle);
    }
  });
});
