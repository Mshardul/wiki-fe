import { describe, expect, it } from "vitest";
import { SEED_MAX } from "./fields";
import { formatSeed, mulberry32, randomSeed } from "./rng";

describe("rng", () => {
  it("is deterministic per seed and stays in [0, 1)", () => {
    const a = mulberry32(0x7f3a);
    const b = mulberry32(0x7f3a);
    const xs = Array.from({ length: 50 }, () => a());
    expect(Array.from({ length: 50 }, () => b())).toEqual(xs);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("differs between seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("randomSeed stays within the seed range", () => {
    for (let i = 0; i < 100; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(SEED_MAX);
    }
  });

  it("formatSeed renders 4-digit lowercase hex", () => {
    expect(formatSeed(0x7f3a)).toBe("7f3a");
    expect(formatSeed(10)).toBe("000a");
  });
});
