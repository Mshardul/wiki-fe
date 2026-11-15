import { describe, expect, it } from "vitest";
import {
  clockwiseIndex,
  hashKey,
  nodeNumber,
  rendezvousScore,
  ringOwner,
  ringPoints,
  ringShares,
  VNODE_TABLE,
} from "./hash";
import { NODE_LETTERS } from "./types";

const share = (nodes: string[], v: number) => ringShares(ringPoints(nodes, v));

describe("hashKey", () => {
  it("matches the hand-hashed default keys", () => {
    // 37k + 11 mod 100: 12 -> 455 -> 55, 97 -> 3600 -> 0
    const keys = [12, 18, 29, 61, 65, 66, 79, 97];
    expect(keys.map(hashKey)).toEqual([55, 77, 84, 68, 16, 53, 34, 0]);
  });
  it("is a bijection on 0 to 99", () => {
    expect(new Set(Array.from({ length: 100 }, (_, k) => hashKey(k))).size).toBe(100);
  });
});

describe("virtual node table", () => {
  it("has 80 distinct positions", () => {
    const all = Object.values(VNODE_TABLE).flat();
    expect(all).toHaveLength(80);
    expect(new Set(all).size).toBe(80);
  });
  it("starts every row at the node's own hash", () => {
    for (const l of NODE_LETTERS) expect(VNODE_TABLE[l]?.[0]).toBe(hashKey(nodeNumber(l)));
  });
});

describe("ring", () => {
  const points = ringPoints(["A", "B", "C"], 1);
  it("owns a key at the first point at or after its hash", () => {
    // A 48, B 85, C 22: hash 34 -> A, hash 85 sits on B, hash 86 wraps to C
    expect(ringOwner(points, 34)).toBe("A");
    expect(ringOwner(points, 85)).toBe("B");
    expect(ringOwner(points, 86)).toBe("C");
    expect(clockwiseIndex(points, 99)).toBe(0);
  });
  it("splits shares as 26/37/37 for A, B, C at one position each", () => {
    expect(share(["A", "B", "C"], 1)).toEqual({ A: 26, B: 37, C: 37 });
  });
  it("evens out at 2, 4 and 8 positions", () => {
    expect(share(["A", "B", "C"], 2)).toEqual({ A: 29, B: 39, C: 32 });
    expect(share(["A", "B", "C"], 4)).toEqual({ A: 38, B: 30, C: 32 });
    expect(share(["A", "B", "C"], 8)).toEqual({ A: 33, B: 33, C: 34 });
  });
  it("shrinks the spread at every doubling for 2 to 6 starting nodes", () => {
    for (let n = 2; n <= 6; n++) {
      const spread = (v: number) => {
        const s = Object.values(share(NODE_LETTERS.slice(0, n), v));
        return Math.max(...s) - Math.min(...s);
      };
      expect(spread(2)).toBeLessThan(spread(1));
      expect(spread(4)).toBeLessThan(spread(2));
      expect(spread(8)).toBeLessThan(spread(4));
    }
  });
  it("gives one node the whole ring", () => {
    expect(share(["A"], 1)).toEqual({ A: 100 });
  });
});

describe("rendezvousScore", () => {
  it("scores hash 55 for A, B, C as 72, 89, 6", () => {
    // key 12 hashes to 55: (55*3+7) 172, (55*5+14) 289, (55*7+21) 406 mod 100
    expect(["A", "B", "C"].map((n) => rendezvousScore(12, n))).toEqual([72, 89, 6]);
  });
});
