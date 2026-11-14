import { describe, expect, it } from "vitest";
import { childIndexes, levelCount, levelOf, levelRanges, parentIndex, treeSlot } from "./tree";

describe("tree maths", () => {
  it("parentIndex", () => {
    expect([0, 1, 2, 3, 4, 6].map(parentIndex)).toEqual([-1, 0, 0, 1, 1, 2]);
  });

  it("levelOf and levelCount", () => {
    expect([0, 2, 3, 6, 7].map(levelOf)).toEqual([0, 1, 2, 2, 3]);
    expect(levelCount(0)).toBe(0);
    expect(levelCount(1)).toBe(1);
    expect(levelCount(12)).toBe(4);
  });

  it("childIndexes stays below size", () => {
    expect(childIndexes(1, 5)).toEqual([3, 4]);
    expect(childIndexes(1, 4)).toEqual([3]);
    expect(childIndexes(2, 5)).toEqual([]);
  });

  it("levelRanges", () => {
    expect(levelRanges(6)).toEqual([
      { level: 0, from: 0, to: 0 },
      { level: 1, from: 1, to: 2 },
      { level: 2, from: 3, to: 5 },
    ]);
    expect(levelRanges(0)).toEqual([]);
  });

  it("treeSlot centres each node in its level slot", () => {
    expect(treeSlot(0)).toEqual({ x: 0.5, y: 0 });
    expect(treeSlot(1)).toEqual({ x: 0.25, y: 1 });
    expect(treeSlot(2)).toEqual({ x: 0.75, y: 1 });
    expect(treeSlot(3)).toEqual({ x: 0.125, y: 2 });
    expect(treeSlot(5)).toEqual({ x: 0.625, y: 2 });
  });
});
