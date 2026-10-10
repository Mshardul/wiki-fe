import { describe, expect, it } from "vitest";
import { parseCachingSequence } from "./tokens";
import { generateSequence } from "./trace";
import { WORKLOADS } from "./types";

describe("generateSequence", () => {
  it("is deterministic per seed and has the requested length", () => {
    expect(generateSequence("mixed", 12, 3, 0x7f3a)).toEqual(
      generateSequence("mixed", 12, 3, 0x7f3a),
    );
    expect(generateSequence("mixed", 12, 3, 0x7f3a)).toHaveLength(12);
    expect(generateSequence("mixed", 12, 3, 1)).not.toEqual(generateSequence("mixed", 12, 3, 2));
  });

  it("always produces tokens the parser accepts", () => {
    for (const w of WORKLOADS) {
      const seq = generateSequence(w, 24, 5, 99);
      expect(parseCachingSequence(seq.join(""))).toEqual({ ok: true, tokens: seq });
    }
  });

  it("stays within the requested number of keys", () => {
    const seq = generateSequence("mixed", 24, 2, 5);
    expect(seq.every((t) => t === "!" || "AB".includes(t.charAt(1)))).toBe(true);
  });

  it("puts no race or crash tokens in the plain workloads", () => {
    for (const w of ["read", "mixed", "write"] as const) {
      for (let seed = 0; seed < 20; seed++) {
        const seq = generateSequence(w, 24, 3, seed);
        expect(seq.every((t) => t.startsWith("R") || t.startsWith("W"))).toBe(true);
      }
    }
  });

  it("racing writes produce X tokens and the crash workload exactly one crash", () => {
    const racing = Array.from({ length: 21 }, (_, s) => generateSequence("race", 24, 3, s));
    expect(racing.some((seq) => seq.some((t) => t.startsWith("X")))).toBe(true);
    const crash = generateSequence("crash", 20, 3, 7);
    expect(crash.filter((t) => t === "!")).toHaveLength(1);
    expect(crash[Math.floor(20 * 0.7)]).toBe("!");
  });

  it("read share follows the workload", () => {
    const share = (w: "read" | "write"): number => {
      let reads = 0;
      let total = 0;
      for (let seed = 0; seed < 50; seed++) {
        for (const t of generateSequence(w, 24, 3, seed)) {
          total++;
          if (t.startsWith("R")) reads++;
        }
      }
      return reads / total;
    };
    expect(share("read")).toBeGreaterThan(0.75);
    expect(share("write")).toBeLessThan(0.45);
  });
});
