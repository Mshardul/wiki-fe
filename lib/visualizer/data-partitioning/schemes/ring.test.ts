import { describe, expect, it } from "vitest";
import { DEFAULT_KEYS, holdings, last, placed, run } from "../test-helpers";

describe("ring with one position per node", () => {
  const events = run("ring", { events: ["+"] });
  it("walks clockwise from each key's hash", () => {
    expect(holdings(DEFAULT_KEYS, placed(events, 8).owners)).toEqual({
      A: [79],
      B: [12, 18, 29, 61, 66],
      C: [65, 97],
    });
  });
  it("moves 2 of 8 when D joins at 59", () => {
    const end = last(events);
    expect(holdings(DEFAULT_KEYS, end.owners)).toEqual({
      A: [79],
      B: [18, 29, 61],
      C: [65, 97],
      D: [12, 66],
    });
    expect(end.moved).toBe(2);
  });
  it("sends a removed node's keys to the next node clockwise", () => {
    // remove B (85): its hashes 55 77 84 68 53 fall to C at 22 by wrapping
    const end = last(run("ring", { events: ["-B"] }));
    expect(holdings(DEFAULT_KEYS, end.owners).C).toEqual([12, 18, 29, 61, 65, 66, 97]);
  });
});

describe("ring with four positions per node", () => {
  it("evens the keys and still moves 2 of 8", () => {
    const events = run("ring", { vnodes: 4, events: ["+"] });
    expect(holdings(DEFAULT_KEYS, placed(events, 8).owners)).toEqual({
      A: [79, 97],
      B: [12, 29, 65, 66],
      C: [18, 61],
    });
    const end = last(events);
    expect(holdings(DEFAULT_KEYS, end.owners)).toEqual({
      A: [79, 97],
      B: [29, 65],
      C: [18, 61],
      D: [12, 66],
    });
    expect(end.moved).toBe(2);
  });
});
