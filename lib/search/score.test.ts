import { beforeEach, describe, expect, it } from "vitest";
import { getFallbackSuggestions, type SearchEntry, scoreMatch } from "./score";
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
