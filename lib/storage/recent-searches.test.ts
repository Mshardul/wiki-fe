import { beforeEach, describe, expect, it } from "vitest";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "./recent-searches";

describe("recent-searches", () => {
  beforeEach(() => localStorage.clear());

  it("adds newest-first, dedupes, and caps at 10", () => {
    for (let i = 0; i < 12; i++) addRecentSearch(`q${i}`);
    addRecentSearch("q5");
    const list = getRecentSearches();
    expect(list).toHaveLength(10);
    expect(list[0]).toBe("q5");
  });

  it("ignores blank queries", () => {
    addRecentSearch("   ");
    expect(getRecentSearches()).toHaveLength(0);
  });

  it("removes and clears", () => {
    addRecentSearch("a");
    addRecentSearch("b");
    removeRecentSearch("a");
    expect(getRecentSearches()).toEqual(["b"]);
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });
});
