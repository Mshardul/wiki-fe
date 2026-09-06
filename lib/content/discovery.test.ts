import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { discoverArticlePaths, parseIndexSections } from "./discovery";
import { verticalRegistry } from "./verticals";

describe("vertical registry", () => {
  it("has unique ids", () => {
    const ids = verticalRegistry().map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("points every indexPath at an existing index.md", () => {
    for (const v of verticalRegistry()) expect(existsSync(v.indexPath)).toBe(true);
  });
});

const mini = readFileSync("lib/content/fixtures/mini-index.md", "utf8");

describe("parseIndexSections", () => {
  it("returns sections in document order", () => {
    const s = parseIndexSections(mini, "content/dsa");
    expect(s.map((x) => x.heading)).toEqual(["Data Structures", "Algorithms", "Patterns"]);
  });
  it("lists articles under each section with resolved paths", () => {
    const s = parseIndexSections(mini, "content/dsa");
    const first = s[0]?.articles[0];
    expect(first).toBeDefined();
    expect(typeof first?.title).toBe("string");
    expect(first?.path).toMatch(/\.md$/);
    expect(first?.slug).toEqual(["data-structures", "array"]);
  });
  it("resolves every article path under content/", () => {
    const s = parseIndexSections(mini, "content/dsa");
    const allPaths = s.flatMap((x) => x.articles.map((a) => a.path));
    expect(allPaths.length).toBeGreaterThan(0);
    expect(allPaths.every((p) => p.startsWith("content/"))).toBe(true);
  });
});

describe("parseIndexSections on real index.md", () => {
  for (const v of verticalRegistry()) {
    it(`${v.id} yields a non-empty section list`, () => {
      const dir = v.indexPath.replace(/\/index\.md$/, "");
      const sections = parseIndexSections(readFileSync(v.indexPath, "utf8"), dir);
      expect(sections.length).toBeGreaterThan(0);
      expect(sections.some((s) => s.articles.length > 0)).toBe(true);
    });
  }
});

describe("discoverArticlePaths", () => {
  for (const v of verticalRegistry()) {
    it(`${v.id} returns an ordered, deduped list of real .md files`, () => {
      const paths = discoverArticlePaths(v.id);
      expect(paths.length).toBeGreaterThan(0);
      expect(new Set(paths).size).toBe(paths.length);
      for (const p of paths) {
        expect(p.endsWith(".md")).toBe(true);
        expect(existsSync(p)).toBe(true);
      }
    });
  }
});
