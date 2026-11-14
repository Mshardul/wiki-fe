import { describe, expect, it } from "vitest";
import type { HeapItem } from "./engine";
import { topKRun } from "./topk";

const items = (...v: number[]): HeapItem[] => v.map((value) => ({ value }));
const SAMPLE = items(5, 3, 8, 1, 4, 7);
const finalHeap = (ev: ReturnType<typeof topKRun>) => (ev.at(-1)?.heap ?? []).map((x) => x.value);
const sig = (e: ReturnType<typeof topKRun>[number]) =>
  JSON.stringify([e.heap, e.stream, e.skipped, e.leaving, e.hole, e.node, e.others, e.reading]);

describe("top-K run", () => {
  it("keeps the 3 largest of the sample with a min-heap", () => {
    const ev = topKRun(SAMPLE, 3, "min");
    expect(ev.map((e) => e.badge)).toEqual([
      "Start",
      "Read",
      "Add",
      "Read",
      "Add",
      "Compare",
      "Swap",
      "Read",
      "Add",
      "Compare",
      "In place",
      "Read",
      "Check root",
      "Skip",
      "Read",
      "Check root",
      "Evict",
      "Place",
      "Pick child",
      "Compare",
      "In place",
      "Read",
      "Check root",
      "Evict",
      "Place",
      "Pick child",
      "Compare",
      "Swap",
      "Done",
    ]);
    expect(finalHeap(ev)).toEqual([5, 7, 8]);
    expect(ev.at(-1)).toMatchObject({ comparisons: 9, evictions: 2 });
  });

  it("keeps the 3 smallest with a max-heap", () => {
    const ev = topKRun(SAMPLE, 3, "max");
    expect(finalHeap(ev)).toEqual([4, 3, 1]);
    expect(ev.at(-1)?.evictions).toBe(2);
    expect(ev.filter((e) => e.badge === "Skip")).toHaveLength(1);
  });

  it("never skips or evicts when k is at or above the value count", () => {
    for (const k of [6, 9]) {
      const badges = topKRun(SAMPLE, k, "min").map((e) => e.badge);
      expect(badges).not.toContain("Skip");
      expect(badges).not.toContain("Evict");
    }
  });

  it("skips a value equal to the root", () => {
    const ev = topKRun(items(5, 6, 7, 5), 3, "min");
    expect(ev.map((e) => e.badge)).toContain("Skip");
    expect(ev.at(-1)?.evictions).toBe(0);
  });

  it("no two adjacent events are identical", () => {
    for (const input of [SAMPLE, items(2, 2, 2, 2, 2), items(1, 2)]) {
      for (const order of ["min", "max"] as const) {
        const ev = topKRun(input, 3, order);
        ev.forEach((e, i) => {
          if (i > 0) expect(sig(e)).not.toBe(sig(ev[i - 1] as (typeof ev)[number]));
        });
      }
    }
  });
});
