import { describe, expect, it } from "vitest";
import type { RankingModel } from "../../core/shapes";
import { simulate } from "../simulate";
import { lfu } from "./lfu";

const TRACE = "ABCADEAFBAGC".split("");
const frames = simulate(lfu, 4, TRACE);
const rank = (i: number) => frames[i]?.model as RankingModel;

describe("LFU", () => {
  it("hits and evictions match the reference", () => {
    expect(frames.flatMap((f, i) => (f.outcome === "good" ? [i] : []))).toEqual([3, 6, 9]);
    const evicted = frames.map((f) => {
      const v = f.vars.find((r) => r.name === "removed")?.value;
      return v === "—" ? null : v;
    });
    expect(evicted).toEqual([null, null, null, null, null, "B", null, "C", "D", null, "E", "F"]);
  });

  it("request 8: rows ranked by count, ties by recency, so the bottom row is the next victim", () => {
    expect(rank(7).rows).toEqual([
      { key: "A", count: 3 },
      { key: "F", count: 1 },
      { key: "E", count: 1 },
      { key: "D", count: 1 },
    ]);
    expect(rank(7).next).toBe("D");
    expect(rank(7).removed).toBe("C");
    expect(rank(7).tone).toBe("new");
    expect(frames[7]?.vars.find((v) => v.name === "uses of key")?.value).toBe("1");
    expect(frames[7]?.vars.find((v) => v.name === "lowest uses")?.value).toBe("1");
  });

  it("a hit raises the count and the row climbs past older keys with the same count", () => {
    expect(rank(3).rows).toEqual([
      { key: "A", count: 2 },
      { key: "C", count: 1 },
      { key: "B", count: 1 },
    ]);
    expect(rank(3).tone).toBe("existing");
    expect(rank(3).active).toBe("A");
  });

  it("has no next-out until full, and reports capacity for the empty slots", () => {
    expect(rank(1).rows).toEqual([
      { key: "B", count: 1 },
      { key: "A", count: 1 },
    ]);
    expect(rank(1).capacity).toBe(4);
    expect(rank(1).next).toBeNull();
  });

  it("an evicted key comes back with a fresh count", () => {
    // A ties with B and is older, so C evicts A; then A evicts B and restarts at 1.
    const f = simulate(lfu, 2, ["A", "B", "C", "A"]);
    expect(f[2]?.vars.find((v) => v.name === "removed")?.value).toBe("A");
    const last = f[3]?.model as RankingModel;
    expect(last.rows).toEqual([
      { key: "A", count: 1 },
      { key: "C", count: 1 },
    ]);
  });
});
