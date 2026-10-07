import { describe, expect, it } from "vitest";
import { generateTrace } from "./trace";

describe("generateTrace", () => {
  it("is deterministic per seed", () => {
    expect(generateTrace("hot", 24, 0x7f3a, 4)).toEqual(generateTrace("hot", 24, 0x7f3a, 4));
    expect(generateTrace("uniform", 24, 1, 4)).not.toEqual(generateTrace("uniform", 24, 2, 4));
  });

  it("returns the requested length", () => {
    for (const p of ["hot", "scan", "loop", "uniform"] as const) {
      expect(generateTrace(p, 17, 3, 4)).toHaveLength(17);
    }
  });

  it("hot set draws ~60% of requests from A/B and the rest from C–H", () => {
    const t = generateTrace("hot", 400, 9, 4);
    const hot = t.filter((k) => k === "A" || k === "B").length;
    expect(hot / t.length).toBeGreaterThan(0.5);
    expect(hot / t.length).toBeLessThan(0.7);
    expect(t.every((k) => "ABCDEFGH".includes(k))).toBe(true);
  });

  it("scan: hot keys, a sweep of one-off keys, hot keys again", () => {
    expect(generateTrace("scan", 12, 0, 4).join("")).toBe("ABABCDEFGHAB");
  });

  it("loop cycles over capacity + 1 keys", () => {
    expect(generateTrace("loop", 12, 0, 4).join("")).toBe("ABCDEABCDEAB");
    expect(generateTrace("loop", 6, 0, 2).join("")).toBe("ABCABC");
  });

  it("uniform stays inside A–H", () => {
    expect(generateTrace("uniform", 200, 5, 4).every((k) => "ABCDEFGH".includes(k))).toBe(true);
  });
});
