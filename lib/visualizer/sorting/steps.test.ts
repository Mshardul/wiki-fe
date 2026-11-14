import { describe, expect, it } from "vitest";
import type { ArrayModel } from "../core/shapes";
import { DEFS } from "./defs";
import { domainOf, makeValues, tagItems } from "./input";
import { resultOf } from "./test-helpers";
import { SORT_IDS, type SortId } from "./types";

const INPUTS = (algo: SortId): Record<string, number[]> => {
  const d = domainOf(algo);
  const mid = Math.round((d.min + d.max) / 2);
  return {
    random: makeValues("random", 9, 11, d),
    sorted: [d.min, d.min + 1, mid, mid + 1, d.max],
    "all-equal": [mid, mid, mid, mid, mid],
    "size 4": makeValues("random", 4, 5, d),
    duplicates: makeValues("duplicates", 8, 21, d),
  };
};

const positionsDiffering = (a: ArrayModel, b: ArrayModel): number => {
  const x = a.rows[0]?.bars ?? [];
  const y = b.rows[0]?.bars ?? [];
  return x.filter((bar, i) => bar?.value !== y[i]?.value).length;
};

describe("sorting steps", () => {
  for (const id of SORT_IDS) {
    const def = DEFS[id];
    for (const [name, values] of Object.entries(INPUTS(id))) {
      it(`${id} on ${name}: no repeats, ends sorted, paths valid`, () => {
        for (const stable of [false, true]) {
          const steps = def.steps(tagItems(values, stable));
          expect(steps[0]?.badge).toBe("Start");
          expect(steps[steps.length - 1]?.badge).toBe("Done");
          steps.forEach((s, i) => {
            if (i > 0) {
              expect(JSON.stringify(s.array)).not.toBe(JSON.stringify(steps[i - 1]?.array));
            }
            for (const p of s.path) expect(p).toBeLessThan(def.lines.length);
          });
          const out = resultOf(steps[steps.length - 1] as (typeof steps)[number]).map((v) =>
            Number.parseInt(v, 10),
          );
          expect(out).toEqual([...values].sort((a, b) => a - b));
          if (id === "insertion" || id === "selection" || id === "quick") {
            steps.forEach((s, i) => {
              if (i === 0) return;
              const prev = steps[i - 1];
              if (prev) expect(positionsDiffering(prev.array, s.array)).toBeLessThanOrEqual(2);
            });
          }
        }
      });
    }
    it(`${id} copy has 2 to 4 plain lines`, () => {
      expect(def.lines.length).toBeGreaterThanOrEqual(2);
      expect(def.lines.length).toBeLessThanOrEqual(4);
    });
  }
});
