import { beforeEach, describe, expect, it } from "vitest";
import { getFallbackSuggestions, type SearchEntry, scoreMatch, searchEntries } from "./score";
import { _setSynonyms } from "./synonyms";

const entry = (over: Partial<SearchEntry> = {}): SearchEntry => ({
  title: "Hash Table",
  path: "content/dsa/data-structures/hash-table.md",
  slug: "hash-table",
  section: "Data Structures",
  description: "A hash table maps keys to buckets via a hash function; O(1) average lookup.",
  verticalId: "dsa",
  verticalTitle: "DSA",
  ...over,
});

describe("scoreMatch ladder", () => {
  beforeEach(() => _setSynonyms({}));

  it("title exact = 100", () => {
    expect(scoreMatch("hash table", entry())).toBe(100);
  });
  it("title startsWith = 90", () => {
    expect(scoreMatch("hash", entry({ title: "Hashing" }))).toBe(90);
  });
  it("title includes = 80", () => {
    expect(scoreMatch("table", entry())).toBe(80);
  });
  it("title fuzzy = 60", () => {
    expect(scoreMatch("hsh tbl", entry())).toBe(60);
  });
  it("non-short desc includes = 40", () => {
    expect(scoreMatch("buckets", entry())).toBe(40);
  });
  it("short query does not match description", () => {
    expect(scoreMatch("O(1)", entry({ title: "Array" }))).toBe(0);
  });
  it("section fuzzy = 10 for a non-short query", () => {
    expect(scoreMatch("structures", entry({ title: "Zzz", description: "" }))).toBe(10);
  });

  it("expands via synonyms — 'map' finds 'hash table'", () => {
    _setSynonyms({ map: ["hash table"] });
    expect(scoreMatch("map", entry())).toBe(100);
  });
});

describe("getFallbackSuggestions", () => {
  beforeEach(() => _setSynonyms({}));

  it("returns a didYouMean from a synonym that has hits", () => {
    _setSynonyms({ map: ["hash table"] });
    const { didYouMean } = getFallbackSuggestions("map", [entry()]);
    expect(didYouMean).toBe("hash table");
  });

  it("returns fuzzy title matches when nothing scores", () => {
    const { fuzzy } = getFallbackSuggestions("hshtbl", [
      entry(),
      entry({ title: "Array", slug: "array" }),
    ]);
    expect(fuzzy.map((e) => e.title)).toContain("Hash Table");
  });
});

describe("searchEntries filters", () => {
  beforeEach(() => _setSynonyms({}));

  const dsa = entry({ verticalId: "dsa", verticalTitle: "DSA" });
  const sd = entry({
    title: "Caching",
    verticalId: "system-design",
    verticalTitle: "System Design",
    path: "content/system-design/components/caching.md",
    slug: "caching",
    description: "A cache stores recently-accessed values for fast retrieval.",
  });

  it("includes both verticals by default", () => {
    const r = searchEntries([dsa, sd], "table", { verticalId: null, unreadOnly: false }, new Set());
    expect(r).toHaveLength(1);
    expect(r[0]!.title).toBe("Hash Table");
  });

  it("filters by vertical", () => {
    const r = searchEntries(
      [dsa, sd],
      "table",
      { verticalId: "system-design", unreadOnly: false },
      new Set(),
    );
    expect(r).toHaveLength(0);
  });

  it("filters by unread only", () => {
    const r = searchEntries(
      [dsa, sd],
      "table",
      { verticalId: null, unreadOnly: true },
      new Set([`dsa:${dsa.path}`]),
    );
    expect(r).toHaveLength(0);
  });

  it("excludes completed entries but keeps others", () => {
    // "caching" matches only the sd entry; with sd marked completed and unreadOnly on, nothing returns.
    const r = searchEntries(
      [dsa, sd],
      "caching",
      { verticalId: null, unreadOnly: true },
      new Set([`system-design:${sd.path}`]),
    );
    expect(r).toHaveLength(0);
  });

  it("keeps an unread entry when another is completed", () => {
    // "table" matches only the dsa entry; marking sd completed leaves dsa untouched.
    const r = searchEntries(
      [dsa, sd],
      "table",
      { verticalId: null, unreadOnly: true },
      new Set([`system-design:${sd.path}`]),
    );
    expect(r).toHaveLength(1);
    expect(r[0]!.title).toBe("Hash Table");
  });
});
