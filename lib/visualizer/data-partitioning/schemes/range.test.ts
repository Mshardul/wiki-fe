import { describe, expect, it } from "vitest";
import { DEFAULT_KEYS, holdings, last, placed, run } from "../test-helpers";
import { range } from "./range";

const ranges = (e: ReturnType<typeof run>[number]) =>
  e.state.ranges.map((r) => `${r.node}${r.lo}-${r.hi}`);

describe("range", () => {
  it("splits 0 to 99 equally and places by raw key", () => {
    const p = placed(run("range"), 8);
    expect(ranges(p)).toEqual(["A0-32", "B33-65", "C66-99"]);
    expect(holdings(DEFAULT_KEYS, p.owners)).toEqual({
      A: [12, 18, 29],
      B: [61, 65],
      C: [66, 79, 97],
    });
  });
  it("splits the fullest range at its median key when D joins", () => {
    // A and C tie at 3 keys, lowest range A splits at the key at index 1: 18
    const end = last(run("range", { events: ["+"] }));
    expect(ranges(end)).toEqual(["A0-17", "D18-32", "B33-65", "C66-99"]);
    expect(end.moved).toBe(2);
  });
  it("falls back to the midpoint when the median is the low end", () => {
    // one key at 0 in a range 0 to 32: median 0 equals lo, cut at floor(32/2) + 1 = 17
    const end = last(run("range", { keys: ["0", "70", "71"], start: 3, events: ["+"] }));
    expect(ranges(end)[0]).toBe("A0-32");
    // C holds 70 71: fullest, median index 1 -> 71, so C 66-70, D 71-99
    expect(ranges(end)).toEqual(["A0-32", "B33-65", "C66-70", "D71-99"]);
  });
  it("uses the midpoint cut when the fullest range's median is its low end", () => {
    const end = last(run("range", { keys: ["0"], start: 3, events: ["+"] }));
    expect(ranges(end)).toEqual(["A0-16", "D17-32", "B33-65", "C66-99"]);
  });
  it("skips a one-value range that cannot split and uses the next fullest", () => {
    // A holds 5 alone in 5-5; it is fullest but cannot split, so B 6-99 (no keys) splits at 53
    const state = {
      nodes: ["A", "B"],
      vnodes: 1,
      ranges: [
        { node: "A", lo: 5, hi: 5 },
        { node: "B", lo: 6, hi: 99 },
      ],
    };
    const out = range.apply(state, { kind: "add", letter: "C" }, [{ key: 5, hot: false }], ["A"]);
    expect(out.state.ranges.map((r) => `${r.node}${r.lo}-${r.hi}`)).toEqual([
      "A5-5",
      "B6-52",
      "C53-99",
    ]);
  });
  it("merges a removed range into its lower neighbour, and the upper one if first", () => {
    expect(ranges(last(run("range", { events: ["-B"] })))).toEqual(["A0-65", "C66-99"]);
    expect(ranges(last(run("range", { events: ["-A"] })))).toEqual(["B0-65", "C66-99"]);
  });
  it("piles sequential keys onto one range", () => {
    const keys = ["90", "91", "92", "93", "94", "95", "96", "97"];
    expect(holdings(keys, placed(run("range", { keys }), 8).owners)).toEqual({
      C: [90, 91, 92, 93, 94, 95, 96, 97],
    });
  });
});
