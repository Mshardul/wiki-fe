import { describe, expect, it } from "vitest";
import { layoutRows, maxColsFor } from "./layout";

describe("layoutRows", () => {
  it("four columns: rows are even, longer rows first", () => {
    expect(layoutRows(1, 4)).toEqual([1]);
    expect(layoutRows(2, 4)).toEqual([2]);
    expect(layoutRows(4, 4)).toEqual([4]);
    expect(layoutRows(5, 4)).toEqual([3, 2]);
    expect(layoutRows(6, 4)).toEqual([3, 3]);
    expect(layoutRows(7, 4)).toEqual([4, 3]);
    expect(layoutRows(8, 4)).toEqual([4, 4]);
    expect(layoutRows(9, 4)).toEqual([3, 3, 3]);
  });

  it("three columns", () => {
    expect(layoutRows(3, 3)).toEqual([3]);
    expect(layoutRows(4, 3)).toEqual([2, 2]);
    expect(layoutRows(7, 3)).toEqual([3, 2, 2]);
  });

  it("two columns: an odd count ends in a single card", () => {
    expect(layoutRows(3, 2)).toEqual([2, 1]);
    expect(layoutRows(5, 2)).toEqual([2, 2, 1]);
    expect(layoutRows(9, 2)).toEqual([2, 2, 2, 2, 1]);
  });

  it("never throws and never loses a card", () => {
    expect(layoutRows(0, 4)).toEqual([]);
    expect(layoutRows(-3, 4)).toEqual([]);
    expect(layoutRows(3, 0)).toEqual([1, 1, 1]);
    expect(layoutRows(3, -2)).toEqual([1, 1, 1]);
    expect(layoutRows(3, Number.NaN)).toEqual([1, 1, 1]);
    for (let n = 1; n <= 12; n++) {
      for (let c = 1; c <= 4; c++) {
        expect(layoutRows(n, c).reduce((a, b) => a + b, 0)).toBe(n);
        expect(Math.max(...layoutRows(n, c))).toBeLessThanOrEqual(c);
      }
    }
  });
});

describe("maxColsFor", () => {
  it("steps at the group thresholds", () => {
    expect(maxColsFor(0)).toBe(1);
    expect(maxColsFor(539)).toBe(1);
    expect(maxColsFor(540)).toBe(2);
    expect(maxColsFor(809)).toBe(2);
    expect(maxColsFor(810)).toBe(3);
    expect(maxColsFor(1089)).toBe(3);
    expect(maxColsFor(1090)).toBe(4);
    expect(maxColsFor(3000)).toBe(4);
  });
});
