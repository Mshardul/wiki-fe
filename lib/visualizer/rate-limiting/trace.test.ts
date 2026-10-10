import { describe, expect, it } from "vitest";
import { generateTicks } from "./trace";
import { axisOf, MAX_REQUESTS, type Pace, paramsOf, WORKLOADS } from "./types";

const DEFAULT = paramsOf(3, 2);
const COMBOS: [number, Pace][] = [2, 3, 4, 5].flatMap((l) => [
  [l, 1] as [number, Pace],
  [l, 2] as [number, Pace],
]);

describe("generateTicks", () => {
  it("is deterministic per seed", () => {
    for (const w of WORKLOADS) {
      expect(generateTicks(w, DEFAULT, 0x7f3a)).toEqual(generateTicks(w, DEFAULT, 0x7f3a));
    }
  });

  it("boundary straddle at the defaults is exactly the default stream", () => {
    for (const seed of [0, 1, 0x7f3a]) {
      expect(generateTicks("straddle", DEFAULT, seed)).toEqual([4, 5, 5, 6, 6, 7, 7, 11]);
    }
  });

  it("burst is Limit + 2 requests at one tick, then one a window later", () => {
    const ticks = generateTicks("burst", DEFAULT, 9);
    const b = ticks[0] ?? -1;
    expect(ticks.slice(0, 5)).toEqual([b, b, b, b, b]);
    expect(ticks).toHaveLength(6);
    expect(ticks[5]).toBe(Math.min(11, b + 6));
    expect(b).toBeLessThan(6);
  });

  it("idle then burst drains the bucket, waits a window, then bursts Limit + 1", () => {
    const ticks = generateTicks("idle-burst", DEFAULT, 4);
    expect(ticks.slice(0, 3)).toEqual([0, 0, 0]);
    const g = ticks[3] ?? -1;
    expect(g).toBeGreaterThanOrEqual(6);
    expect(g).toBeLessThanOrEqual(11);
    expect(ticks.slice(3)).toEqual([g, g, g, g]);
  });

  it("steady spaces requests by the pace across the whole axis", () => {
    for (const seed of Array.from({ length: 10 }, (_, i) => i)) {
      const ticks = generateTicks("steady", DEFAULT, seed);
      expect(ticks).toHaveLength(6);
      expect(ticks.every((t, i) => i === 0 || t - (ticks[i - 1] ?? 0) === 2)).toBe(true);
      expect(ticks[0]).toBeLessThan(2);
    }
    expect(generateTicks("steady", paramsOf(3, 1), 0)).toHaveLength(12);
  });

  it("every motif is sorted, fits the axis and fits the 14-request cap for every Limit and Pace", () => {
    for (const [limit, pace] of COMBOS) {
      const p = paramsOf(limit, pace);
      for (const w of WORKLOADS) {
        for (const seed of [0, 1, 2, 3, 4, 5, 6, 7]) {
          const ticks = generateTicks(w, p, seed);
          const label = `${w} L${limit} K${pace} seed ${seed}`;
          expect(ticks.length, label).toBeGreaterThan(0);
          expect(ticks.length, label).toBeLessThanOrEqual(MAX_REQUESTS);
          expect(
            ticks.every((t, i) => i === 0 || t >= (ticks[i - 1] ?? 0)),
            label,
          ).toBe(true);
          expect(Math.max(...ticks), label).toBeLessThan(axisOf(p, []));
          expect(Math.min(...ticks), label).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("the straddle motif sits across a window boundary at every Limit and Pace", () => {
    for (const [limit, pace] of COMBOS) {
      const p = paramsOf(limit, pace);
      const ticks = generateTicks("straddle", p, 3);
      const before = ticks.filter((t) => t < (ticks[limit] ?? 0));
      expect(before.length).toBe(limit);
      const b = ticks[limit] ?? 0;
      expect(b % p.window).toBe(0);
    }
  });
});
