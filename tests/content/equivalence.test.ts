import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalize } from "./normalize";
import { buildSearchIndex } from "../../lib/content/search-index";
import { buildBacklinks } from "../../lib/content/backlinks";
import { buildBrokenLinks } from "../../lib/content/broken-links";
import { validateBridges } from "../../lib/content/bridges";

function ref(name: string): unknown {
  return JSON.parse(readFileSync(`tests/content/reference/${name}`, "utf8"));
}

describe("Python-generator equivalence (normalized deep-compare)", () => {
  it("search-index matches the Python reference", () => {
    expect(normalize(buildSearchIndex())).toEqual(normalize(ref("search-index.json")));
  });

  it("backlinks matches the Python reference", () => {
    expect(normalize(buildBacklinks(buildSearchIndex()))).toEqual(normalize(ref("backlinks.json")));
  });

  it("broken-links matches the Python reference", () => {
    expect(normalize(buildBrokenLinks(buildSearchIndex()))).toEqual(
      normalize(ref("broken-links.json")),
    );
  });

  it("bridges validation passes and the file is unchanged", () => {
    const result = validateBridges();
    expect(result.errors).toEqual([]);
    expect(normalize(result.bridges)).toEqual(normalize(ref("bridges.json")));
  });
});
