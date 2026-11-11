import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VISUALIZERS } from "../registry";
import {
  MECHANISM_GLOSSARY_TERM,
  type MechanismSlug,
  mechanismArticleHref,
  mechanismRelated,
} from "./links";
import { MECHANISM_MANIFEST, mechanismKeyForRouteSlug } from "./manifest";

describe("mechanism links", () => {
  const glossary = JSON.parse(
    readFileSync(join(process.cwd(), "data/glossary.json"), "utf8"),
  ) as Record<string, string>;
  const vizSlugs = new Set(VISUALIZERS.map((v) => v.slug));

  it("article href matches manifest expectReadArticle", () => {
    for (const [slug, row] of Object.entries(MECHANISM_MANIFEST.slugs)) {
      const key = mechanismKeyForRouteSlug(slug);
      expect(key, slug).toBeDefined();
      const href = mechanismArticleHref(key!);
      if (row.expectReadArticle) {
        expect(href.startsWith("/system-design/"), slug).toBe(true);
      } else {
        expect(href, slug).toBe("");
      }
    }
  });

  it("maps every mechanism glossaryTerm to data/glossary.json", () => {
    for (const term of Object.values(MECHANISM_GLOSSARY_TERM)) {
      expect(glossary[term], term).toBeTruthy();
    }
  });

  it("returns related links with href and label", () => {
    const related = mechanismRelated("mvcc");
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((r) => r.href && r.label)).toBe(true);
  });

  it("points See also visualizer hrefs at registered slugs only", () => {
    for (const slug of Object.keys(MECHANISM_GLOSSARY_TERM) as MechanismSlug[]) {
      for (const link of mechanismRelated(slug)) {
        const match = link.href.match(/^\/visualizer\/([^/]+)\/$/);
        if (!match) continue;
        expect(vizSlugs.has(match[1]!), `${slug} → ${link.href}`).toBe(true);
      }
    }
  });
});
