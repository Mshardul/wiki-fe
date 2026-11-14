import { describe, expect, it } from "vitest";
import { homeOf, mathsOf, offsetOf, runsOf, secondLine, secondOf, slotAt } from "./hash";
import { cellsOf, FIXTURE } from "./test-helpers";

const walk = (scheme: "linear" | "quadratic" | "double", key: number, n: number) =>
  Array.from({ length: n }, (_, i) => slotAt(scheme, key, 8, i));

describe("hash maths", () => {
  it("home and second hash", () => {
    expect(homeOf(32, 8)).toBe(0);
    expect(homeOf(0, 8)).toBe(0);
    expect(homeOf(5, 1)).toBe(0);
    expect(secondOf(32)).toBe(5);
    expect(secondOf(6)).toBe(7);
    expect(secondOf(0)).toBe(1);
  });

  it("probe sequences for key 32 at size 8", () => {
    expect(walk("linear", 32, 4)).toEqual([0, 1, 2, 3]);
    expect(walk("quadratic", 32, 8)).toEqual([0, 1, 4, 1, 0, 1, 4, 1]);
    expect(walk("double", 32, 8)).toEqual([0, 5, 2, 7, 4, 1, 6, 3]);
  });

  it("offsets and lines", () => {
    expect(offsetOf("quadratic", 32, 3)).toBe(9);
    expect(offsetOf("double", 32, 2)).toBe(10);
    expect(offsetOf("linear", 32, 3)).toBe(3);
    expect(mathsOf(32, 8)).toBe("32 mod 8 = 0");
    expect(secondLine(32)).toBe("1 + 32 mod 7 = 5");
  });

  it("runs need three occupied slots and markers count", () => {
    expect(runsOf(cellsOf(FIXTURE))).toEqual([{ from: 0, to: 2 }]);
    expect(runsOf(cellsOf([16, 8, null, null, 24, 5, 13, null]))).toEqual([{ from: 4, to: 6 }]);
    expect(runsOf(cellsOf([1, 2, null, 3]))).toEqual([]);
    expect(runsOf(cellsOf([1, "x2", 3, null]))).toEqual([{ from: 0, to: 2 }]);
    expect(runsOf(cellsOf([null, null, 1, 2, 3]))).toEqual([{ from: 2, to: 4 }]);
  });
});
