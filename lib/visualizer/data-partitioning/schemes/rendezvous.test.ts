import { describe, expect, it } from "vitest";
import { rendezvousScore } from "../hash";
import { DEFAULT_KEYS, holdings, last, placed, run } from "../test-helpers";
import { winnerOf } from "./rendezvous";

describe("rendezvous", () => {
  const events = run("rendezvous", { events: ["+"] });
  it("gives each key to its highest score", () => {
    expect(holdings(DEFAULT_KEYS, placed(events, 8).owners)).toEqual({
      A: [29],
      B: [12, 18, 65, 79],
      C: [61, 66, 97],
    });
  });
  it("moves only the keys D wins: 29 and 97", () => {
    const end = last(events);
    expect(holdings(DEFAULT_KEYS, end.owners)).toEqual({
      B: [12, 18, 65, 79],
      C: [61, 66],
      D: [29, 97],
    });
    expect(end.moved).toBe(2);
  });
  it("spreads a removed node's keys over the survivors", () => {
    // remove B: 12 and 65 fall to A, 18 and 79 to C
    const end = last(run("rendezvous", { events: ["-B"] }));
    expect(end.moved).toBe(4);
    expect(holdings(DEFAULT_KEYS, end.owners)).toEqual({
      A: [12, 29, 65],
      C: [18, 61, 66, 79, 97],
    });
  });
  it("resolves a tie to the earlier letter", () => {
    // key 54 hashes to 9, where A (1) and E (5) both score 34
    expect(rendezvousScore(54, "A")).toBe(rendezvousScore(54, "E"));
    expect(winnerOf(["A", "E"], 54)).toBe("A");
  });
});
