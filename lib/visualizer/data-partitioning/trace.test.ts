import { describe, expect, it } from "vitest";
import { parseKeys } from "./keys";
import { generateKeys, pickRemoval } from "./trace";

describe("generateKeys", () => {
  it("is deterministic per seed and always a valid key list", () => {
    for (const w of ["random", "sequential", "hot"] as const) {
      const a = generateKeys(w, 1234);
      expect(generateKeys(w, 1234)).toEqual(a);
      expect(parseKeys(a.join(" ")).ok).toBe(true);
      expect(a).toHaveLength(8);
    }
  });
  it("gives sequential keys as eight neighbours from 60 to 99", () => {
    for (const seed of [0, 1, 99, 65535]) {
      const k = generateKeys("sequential", seed).map(Number);
      expect(k[0]).toBeGreaterThanOrEqual(60);
      expect(k[7]).toBeLessThanOrEqual(99);
      expect(k.every((v, i) => i === 0 || v === (k[i - 1] as number) + 1)).toBe(true);
    }
  });
  it("marks exactly one hot key only in the hot workload", () => {
    expect(generateKeys("hot", 7).filter((t) => t.endsWith("*"))).toHaveLength(1);
    expect(generateKeys("random", 7).some((t) => t.endsWith("*"))).toBe(false);
  });
  it("shares the random and hot key set for one seed", () => {
    expect(generateKeys("hot", 7).map((t) => t.replace("*", ""))).toEqual(
      generateKeys("random", 7),
    );
  });
});

describe("pickRemoval", () => {
  it("picks a live node, the same one for the same seed and event", () => {
    const alive = ["A", "B", "C", "D"];
    expect(alive).toContain(pickRemoval(alive, 5, 0));
    expect(pickRemoval(alive, 5, 0)).toBe(pickRemoval(alive, 5, 0));
  });
});
