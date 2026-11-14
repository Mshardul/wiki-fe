import { describe, expect, it } from "vitest";
import {
  buildRun,
  extractRun,
  type HeapEvent,
  type HeapItem,
  heapsortRun,
  insertCost,
  insertRun,
  type Order,
} from "./engine";

const items = (...v: number[]): HeapItem[] => v.map((value) => ({ value }));
const badges = (ev: HeapEvent[]) => ev.map((e) => e.badge);
const values = (e: HeapEvent | undefined) => (e?.items ?? []).map((x) => x.value);
const last = (ev: HeapEvent[]): HeapEvent => ev[ev.length - 1] as HeapEvent;
const sig = (e: HeapEvent) =>
  JSON.stringify([e.items, e.node, e.others, e.size, e.hole, e.leaving, e.sortedFrom]);

describe("heap engine", () => {
  it("insert [3,1,2] min", () => {
    const ev = insertRun(items(3, 1, 2), "min");
    expect(badges(ev)).toEqual([
      "Start",
      "Add",
      "Add",
      "Compare",
      "Swap",
      "Add",
      "Compare",
      "In place",
      "Done",
    ]);
    expect(values(last(ev))).toEqual([1, 3, 2]);
    expect(last(ev)).toMatchObject({ comparisons: 2, swaps: 1 });
  });

  it("extract on [1,2,3,4,5] min", () => {
    const ev = extractRun(items(1, 2, 3, 4, 5), "min");
    expect(badges(ev)).toEqual([
      "Start",
      "Take root",
      "Move last",
      "Pick child",
      "Compare",
      "Swap",
      "Compare",
      "Swap",
      "Done",
    ]);
    expect(values(last(ev))).toEqual([2, 4, 3, 5]);
    expect(last(ev).taken.map((x) => x.value)).toEqual([1]);
    expect(last(ev)).toMatchObject({ comparisons: 3, swaps: 2 });
    expect(ev[1]).toMatchObject({ hole: true, leaving: { value: 1 } });
  });

  it("extract on two values leaves a one-node heap", () => {
    const ev = extractRun(items(1, 2), "min");
    expect(badges(ev)).toEqual(["Start", "Take root", "Move last", "Done"]);
    expect(values(last(ev))).toEqual([2]);
  });

  it("build on [5,4,3,2,1] min and the cost of inserting one by one", () => {
    const ev = buildRun(items(5, 4, 3, 2, 1), "min");
    expect(badges(ev)).toEqual([
      "Start",
      ...Array.from({ length: 3 }, () => ["Pick child", "Compare", "Swap"]).flat(),
      "Done",
    ]);
    expect(ev).toHaveLength(11);
    expect(values(last(ev))).toEqual([1, 2, 3, 5, 4]);
    expect(last(ev)).toMatchObject({ comparisons: 6, swaps: 3 });
    expect(insertCost(items(5, 4, 3, 2, 1), "min")).toEqual({ comparisons: 6, swaps: 6 });
  });

  it("heap sort max on [2,1,3]", () => {
    const ev = heapsortRun(items(2, 1, 3), "max");
    expect(badges(ev)).toEqual([
      "Start",
      "Pick child",
      "Compare",
      "Swap",
      "Heap built",
      "Swap root",
      "Compare",
      "In place",
      "Swap root",
      "Done",
    ]);
    expect(values(last(ev))).toEqual([1, 2, 3]);
    expect(last(ev)).toMatchObject({ comparisons: 3, swaps: 3, size: 0, sortedFrom: 0 });
  });

  it("heap sort min ends descending", () => {
    const ev = heapsortRun(items(2, 5, 1, 4, 3), "min");
    expect(values(last(ev))).toEqual([5, 4, 3, 2, 1]);
  });

  it("heap sort is unstable on equal items", () => {
    const tagged: HeapItem[] = [{ value: 2, tag: "a" }, { value: 2, tag: "b" }, { value: 1 }];
    const out = last(heapsortRun(tagged, "max")).items.map((x) => `${x.value}${x.tag ?? ""}`);
    expect(out).toEqual(["1", "2b", "2a"]);
  });

  it("all-equal input never swaps in insert, extract or build", () => {
    for (const run of [insertRun, extractRun, buildRun]) {
      const ev = run(items(4, 4, 4, 4), "max");
      expect(badges(ev)).not.toContain("Swap");
      expect(last(ev).badge).toBe("Done");
    }
  });

  it("no two adjacent events are identical and size never exceeds the array", () => {
    const inputs = [
      items(5, 3, 8, 1, 4, 7),
      items(2, 2, 2),
      items(1, 2),
      items(9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3),
    ];
    const runs = [insertRun, extractRun, buildRun, heapsortRun];
    const orders: Order[] = ["min", "max"];
    for (const input of inputs) {
      for (const run of runs) {
        for (const order of orders) {
          const ev = run(input, order);
          expect(ev[0]?.badge).toBe("Start");
          expect(last(ev).badge).toBe("Done");
          ev.forEach((e, i) => {
            expect(e.size).toBeLessThanOrEqual(e.items.length);
            if (i > 0) expect(sig(e)).not.toBe(sig(ev[i - 1] as HeapEvent));
          });
        }
      }
    }
  });
});
