import { describe, expect, it } from "vitest";
import { DEFAULT_KEYS, holdings, last, placed, run } from "../test-helpers";

describe("mod-n", () => {
  const events = run("mod-n", { events: ["+"] });
  it("places by hash mod the node count", () => {
    // hashes 55 77 84 68 16 53 34 0 mod 3
    expect(holdings(DEFAULT_KEYS, placed(events, 8).owners)).toEqual({
      A: [29, 97],
      B: [12, 65, 79],
      C: [18, 61, 66],
    });
  });
  it("moves 6 of 8 keys when D joins", () => {
    const end = last(events);
    expect(holdings(DEFAULT_KEYS, end.owners)).toEqual({
      A: [29, 61, 65, 97],
      B: [18, 66],
      C: [79],
      D: [12],
    });
    expect(end.moved).toBe(6);
  });
  it("re-checks a remove with the smaller count, keeping letter order", () => {
    // remove B: nodes A, C; hash mod 2 -> 55 odd C, 77 C, 84 A, 68 A, 16 A, 53 C, 34 A, 0 A
    const end = last(run("mod-n", { events: ["-B"] }));
    expect(holdings(DEFAULT_KEYS, end.owners)).toEqual({
      A: [29, 61, 65, 79, 97],
      C: [12, 18, 66],
    });
  });
});
