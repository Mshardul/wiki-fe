import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MECHANISM_GLOSSARY_TERM, mechanismArticleHref, mechanismRelated } from "./links";

describe("mechanism links", () => {
  const glossary = JSON.parse(
    readFileSync(join(process.cwd(), "data/glossary.json"), "utf8"),
  ) as Record<string, string>;

  it("sets a non-empty article href for every mechanism visualizer", () => {
    for (const slug of Object.keys(MECHANISM_GLOSSARY_TERM) as Array<
      keyof typeof MECHANISM_GLOSSARY_TERM
    >) {
      expect(mechanismArticleHref(slug).startsWith("/system-design/"), slug).toBe(true);
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
});
