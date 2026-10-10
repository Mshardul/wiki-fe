import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { manifestSchema } from "../../lib/content/manifest.schema";
import { STRATEGIES } from "../../lib/visualizer/caching/strategies";
import { CACHING_ARTICLE, POLICIES } from "../../lib/visualizer/eviction/module";
import { ALGORITHM_META, RATE_LIMITING_ARTICLE } from "../../lib/visualizer/rate-limiting/copy";

// globalSetup runs buildContent() once. These asserts lock the emit contract
// without a second full-corpus render (see vitest content project).
const GENERATED_DIR = "lib/content/generated";

const EMITTED = [
  "manifest.json",
  "search-index.json",
  "backlinks.json",
  "broken-links.json",
  "bridges.json",
  "previews.json",
  "complexity-tables.json",
] as const;

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(join(GENERATED_DIR, name), "utf8"));
}

describe("content build artifacts", () => {
  it("emits all seven generated JSON files", () => {
    for (const name of EMITTED) {
      expect(existsSync(join(GENERATED_DIR, name)), name).toBe(true);
    }
  });

  it("eviction visualizer deep links resolve to caching article headings", () => {
    const manifest = manifestSchema.parse(readJson("manifest.json"));
    const article = manifest.articles.find(
      (a) => `/${a.verticalId}/${a.slug.join("/")}/` === CACHING_ARTICLE,
    );
    expect(article, CACHING_ARTICLE).toBeDefined();
    const ids = new Set(article?.headings.map((h) => h.id));
    for (const p of Object.values(POLICIES)) expect(ids.has(p.meta.anchor), p.meta.anchor).toBe(true);
  });

  it("caching-strategies visualizer deep links resolve to caching article headings", () => {
    const manifest = manifestSchema.parse(readJson("manifest.json"));
    const article = manifest.articles.find(
      (a) => `/${a.verticalId}/${a.slug.join("/")}/` === CACHING_ARTICLE,
    );
    expect(article, CACHING_ARTICLE).toBeDefined();
    const ids = new Set(article?.headings.map((h) => h.id));
    for (const def of Object.values(STRATEGIES)) expect(ids.has(def.anchor), def.anchor).toBe(true);
  });

  it("rate-limiting visualizer deep links resolve to the rate-limiting article headings", () => {
    const manifest = manifestSchema.parse(readJson("manifest.json"));
    const article = manifest.articles.find(
      (a) => `/${a.verticalId}/${a.slug.join("/")}/` === RATE_LIMITING_ARTICLE,
    );
    expect(article, RATE_LIMITING_ARTICLE).toBeDefined();
    const ids = new Set(article?.headings.map((h) => h.id));
    for (const meta of Object.values(ALGORITHM_META)) {
      expect(ids.has(meta.anchor), meta.anchor).toBe(true);
    }
  });

  it("manifest parses against manifestSchema and covers the corpus", () => {
    const manifest = manifestSchema.parse(readJson("manifest.json"));
    expect(manifest.articles.length).toBeGreaterThan(150);
    expect(() => new Date(manifest.generatedAt).toISOString()).not.toThrow();
    expect(manifest.generatedAt).toBe(new Date(manifest.generatedAt).toISOString());

    for (const v of manifest.verticals) {
      const inVertical = manifest.articles.filter((a) => a.verticalId === v.id).length;
      expect(v.articleCount).toBe(inVertical);
      expect(v.articleCount).toBeGreaterThan(0);
    }

    for (const a of manifest.articles) {
      expect((a as Record<string, unknown>).html).toBeUndefined();
      expect(Array.isArray(a.headings)).toBe(true);
      expect(typeof a.excerpt).toBe("string");
      expect(a.shapeFingerprint).toHaveProperty("headings");
    }
  });

  it("previews cover every non-stub article and omit stubs", () => {
    const manifest = manifestSchema.parse(readJson("manifest.json"));
    const previews = readJson("previews.json") as Record<
      string,
      { title: string; excerpt: string }
    >;
    const nonStub = manifest.articles.filter((a) => !a.isStub);
    expect(Object.keys(previews).length).toBe(nonStub.length);
    for (const a of nonStub) {
      const entry = previews[`${a.verticalId}/${a.slug.join("/")}`];
      expect(entry).toBeDefined();
      expect(entry!.title).toBeTruthy();
      expect(typeof entry!.excerpt).toBe("string");
      expect(entry!.excerpt).not.toMatch(/<[a-z]/i);
    }
    for (const a of manifest.articles.filter((x) => x.isStub)) {
      expect(previews[`${a.verticalId}/${a.slug.join("/")}`]).toBeUndefined();
    }
  });

  it("complexity tables include known DS entries and only DS keys", () => {
    const tables = readJson("complexity-tables.json") as Record<
      string,
      { columns: string[]; rows: { operation: string }[] }
    >;
    const hashTable = tables["data-structures/hash-table"];
    expect(hashTable).toBeDefined();
    expect(hashTable!.columns.length).toBeGreaterThan(0);
    expect(hashTable!.rows.length).toBeGreaterThan(0);
    expect(hashTable!.rows[0]!.operation).toBeTruthy();
    for (const key of Object.keys(tables)) {
      expect(key.startsWith("data-structures/")).toBe(true);
    }
  });
});
