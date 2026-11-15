import { describe, expect, it } from "vitest";
import { DEFAULT_KEYS, holdings, last, placed, run } from "../test-helpers";

describe("directory", () => {
  it("places each key on the least-loaded node, ties to the earlier letter", () => {
    expect(holdings(DEFAULT_KEYS, placed(run("directory"), 8).owners)).toEqual({
      A: [12, 61, 79],
      B: [18, 65, 97],
      C: [29, 66],
    });
  });
  it("moves only recent keys off the fullest nodes when D joins", () => {
    // loads 3 3 2 0: A gives 79 (3-0 >= 2), B gives 97 (3-1 >= 2), then 2 2 2 2 stops
    const end = last(run("directory", { events: ["+"] }));
    expect(holdings(DEFAULT_KEYS, end.owners)).toEqual({
      A: [12, 61],
      B: [18, 65],
      C: [29, 66],
      D: [79, 97],
    });
    expect(end.moved).toBe(2);
  });
  it("hands a removed node's keys to the least-loaded survivor in order", () => {
    // remove B (18 65 97): A 3, C 2 -> 18 to C (3,3), 65 to A (tie), 97 to C
    const end = last(run("directory", { events: ["-B"] }));
    expect(holdings(DEFAULT_KEYS, end.owners)).toEqual({
      A: [12, 61, 65, 79],
      C: [18, 29, 66, 97],
    });
  });
  it("isolates a hot key: its node gets no more keys until the others catch up", () => {
    // 61 is hot (weight 5): A holds 12 and 61* (load 6) and receives nothing after it
    const keys = ["12", "18", "29", "61*", "65", "66", "79", "97"];
    const owners = placed(run("directory", { keys }), 8).owners;
    expect(holdings(keys, owners)).toEqual({ A: [12, 61], B: [18, 65, 79], C: [29, 66, 97] });
  });
});
