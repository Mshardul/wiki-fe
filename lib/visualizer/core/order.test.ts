import { describe, expect, it } from "vitest";
import { moveItem, reconcileOrder } from "./order";

const DEFAULTS = ["fifo", "lru", "lfu", "clock"];

describe("reconcileOrder", () => {
  it("keeps a valid saved order", () => {
    expect(reconcileOrder(["clock", "lru", "fifo", "lfu"], DEFAULTS)).toEqual([
      "clock",
      "lru",
      "fifo",
      "lfu",
    ]);
  });

  it("drops unknown and duplicate ids and appends missing ones in default order", () => {
    expect(reconcileOrder(["lru", "gone", "lru", "clock"], DEFAULTS)).toEqual([
      "lru",
      "clock",
      "fifo",
      "lfu",
    ]);
  });

  it("falls back to the defaults for malformed input", () => {
    for (const bad of [null, undefined, "lru", 7, {}, [1, 2], [{}]]) {
      expect(reconcileOrder(bad, DEFAULTS)).toEqual(DEFAULTS);
    }
  });
});

describe("moveItem", () => {
  it("moves an item to a new index", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("clamps the target and returns the same array when nothing moves", () => {
    const items = ["a", "b", "c"];
    expect(moveItem(items, 0, 99)).toEqual(["b", "c", "a"]);
    expect(moveItem(items, 2, -4)).toEqual(["c", "a", "b"]);
    expect(moveItem(items, 1, 1)).toBe(items);
    expect(moveItem(items, 2, 99)).toBe(items);
    expect(moveItem(items, 7, 0)).toBe(items);
  });
});
