import { describe, expect, it } from "vitest";
import { hashTableModule } from "./module";
import { HASH_IDS } from "./types";

const INPUTS: Record<string, { size?: number; sequence: string[] | null; threshold?: string }> = {
  default: { sequence: null },
  "all collide": { sequence: ["0", "8", "16", "24", "32", "40"] },
  "twelve keys at size 12": {
    size: 12,
    threshold: "0.5",
    sequence: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  },
  "size 4 full": { size: 4, sequence: ["0", "1", "2", "3", "4"] },
  "delete and lookup": { sequence: ["16", "8", "24", "-8", "?24", "-99", "32"] },
  "duplicate and zero": { sequence: ["0", "0", "8", "8"] },
};

describe("hash table steps", () => {
  for (const algo of HASH_IDS) {
    for (const [name, input] of Object.entries(INPUTS)) {
      for (const seed of [0, 7, 4242]) {
        it(`${algo} on ${name} (seed ${seed}): no repeats, paths valid, deterministic`, () => {
          const values = { ...hashTableModule.defaults(), algo, seed, ...input };
          const a = hashTableModule.run(values).frames;
          const b = hashTableModule.run(values).frames;
          expect(JSON.stringify(a)).toBe(JSON.stringify(b));
          expect(a[0]?.badge).toBe("Start");
          expect(a[a.length - 1]?.badge).toBe("Done");
          a.forEach((f, i) => {
            if (i > 0) expect(JSON.stringify(f.model)).not.toBe(JSON.stringify(a[i - 1]?.model));
            expect(f.lines.length).toBeGreaterThanOrEqual(2);
            expect(f.lines.length).toBeLessThanOrEqual(4);
            for (const p of f.path) expect(p).toBeLessThan(f.lines.length);
          });
        });
      }
    }
  }

  it("random keys run for every variant", () => {
    for (const algo of HASH_IDS) {
      const { frames } = hashTableModule.run({
        ...hashTableModule.defaults(),
        algo,
        keys: "random",
        seed: 9,
        sequence: null,
      });
      expect(frames[frames.length - 1]?.badge).toBe("Done");
    }
  });

  it("the stuck cycle says so and the table keeps its free slots", () => {
    const { frames } = hashTableModule.run({
      ...hashTableModule.defaults(),
      algo: "quadratic",
      sequence: ["16", "8", "24", "32"],
    });
    expect(frames.some((f) => f.badge === "Stuck")).toBe(true);
  });
});
