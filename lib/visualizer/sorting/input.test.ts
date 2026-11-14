import { describe, expect, it } from "vitest";
import { domainOf, makeValues, parseValues, tagItems, toSortInput } from "./input";

describe("sorting input", () => {
  const domain = domainOf("insertion");

  it("domains: radix is two digits, others one", () => {
    expect(domainOf("radix")).toEqual({ min: 10, max: 99 });
    expect(domainOf("quick")).toEqual({ min: 1, max: 9 });
  });

  it("makeValues is deterministic per seed and stays in the domain", () => {
    for (const preset of ["random", "nearly-sorted", "reversed", "duplicates"] as const) {
      const a = makeValues(preset, 9, 1234, domain);
      expect(makeValues(preset, 9, 1234, domain)).toEqual(a);
      expect(a).toHaveLength(9);
      expect(a.every((v) => v >= domain.min && v <= domain.max)).toBe(true);
    }
    expect(makeValues("random", 8, 1, domain)).not.toEqual(makeValues("random", 8, 2, domain));
  });

  it("reversed is non-increasing", () => {
    const v = makeValues("reversed", 10, 77, domain);
    expect(v.every((x, i) => i === 0 || (v[i - 1] ?? 0) >= x)).toBe(true);
  });

  it("duplicates uses at most 3 distinct values", () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(new Set(makeValues("duplicates", 12, seed, domain)).size).toBeLessThanOrEqual(3);
    }
  });

  it("nearly-sorted is within ceil(size/6) adjacent swaps of sorted", () => {
    for (let seed = 0; seed < 20; seed++) {
      const v = makeValues("nearly-sorted", 12, seed, domain);
      let moved = 0;
      const s = [...v].sort((a, b) => a - b);
      for (let i = 0; i < v.length; i++) if (v[i] !== s[i]) moved++;
      // Each adjacent swap displaces at most two positions.
      expect(moved).toBeLessThanOrEqual(2 * Math.ceil(12 / 6));
    }
  });

  it("tagItems tags only repeated values, in input order, when stable", () => {
    expect(tagItems([4, 5, 2, 5, 3], true)).toEqual([
      { value: 4 },
      { value: 5, tag: "a" },
      { value: 2 },
      { value: 5, tag: "b" },
      { value: 3 },
    ]);
    expect(tagItems([4, 5, 2, 5, 3], false).every((i) => i.tag === undefined)).toBe(true);
  });

  it("parseValues reads numbers and rejects junk", () => {
    expect(parseValues("5, 2 x").ok).toBe(false);
    expect(parseValues("5,2,9")).toEqual({ ok: true, tokens: ["5", "2", "9"] });
    expect(parseValues("5").ok).toBe(false);
    expect(parseValues("1 2 3 4 5 6 7 8 9 1 2 3 4").ok).toBe(false);
  });

  it("toSortInput falls back on junk and clamps numbers into the domain", () => {
    const d = toSortInput({
      algo: "nope",
      preset: 3,
      size: 99,
      seed: "x",
      stable: "maybe",
      sequence: ["x", "y"],
    });
    expect(d).toMatchObject({
      algo: "insertion",
      preset: "random",
      size: 12,
      stable: false,
      values: null,
    });
    const one = toSortInput({ algo: "insertion", sequence: ["5"] });
    expect(one.values).toBeNull();
    const clamped = toSortInput({ algo: "radix", sequence: ["5", "250", "40"] });
    expect(clamped.values).toEqual([10, 99, 40]);
    expect(toSortInput({ size: 1 }).size).toBe(4);
  });
});
