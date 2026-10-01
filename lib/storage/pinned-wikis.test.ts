import { beforeEach, describe, expect, it } from "vitest";
import { getPinnedWikis, setPinnedWikis, sortByPin, togglePinnedWiki } from "./pinned-wikis";

beforeEach(() => localStorage.clear());

describe("pinned-wikis", () => {
  it("toggle adds then removes", () => {
    togglePinnedWiki("dsa");
    expect(getPinnedWikis()).toEqual(["dsa"]);
    togglePinnedWiki("dsa");
    expect(getPinnedWikis()).toEqual([]);
  });

  it("sortByPin puts pinned first in stored order, rest after", () => {
    setPinnedWikis(["system-design"]);
    const sorted = sortByPin([{ id: "dsa" }, { id: "system-design" }]);
    expect(sorted.map((s) => s.id)).toEqual(["system-design", "dsa"]);
  });

  it("ignores a non-array / junk value", () => {
    localStorage.setItem("wiki-pinned-wikis", '"nope"');
    expect(getPinnedWikis()).toEqual([]);
  });
});
