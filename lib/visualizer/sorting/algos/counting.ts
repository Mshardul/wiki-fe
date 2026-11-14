import { fill } from "../../core/rich";
import type { ArrayTone } from "../../core/shapes";
import { arrayOf, counter, countRow, labelOf, rowOf } from "../bars";
import type { Item, SortStep } from "../types";

export function countingSteps(items: Item[]): SortStep[] {
  const n = items.length;
  const top = Math.max(9, ...items.map((i) => i.value));
  const scale = Math.max(top, n);
  const values = Array.from({ length: top }, (_, k) => String(k + 1));
  const counts = new Array<number>(top).fill(0);
  const output: (Item | null)[] = new Array<Item | null>(n).fill(null);
  const out: SortStep[] = [];
  let writes = 0;

  const push = (
    s: Pick<SortStep, "badge" | "caption" | "outcome" | "path"> & {
      current?: number;
      placed?: number;
      bump?: number;
      countsLabel?: string;
      countsTone?: ArrayTone;
      latest?: number;
      done?: boolean;
    },
  ) => {
    const inputTone = (k: number): ArrayTone =>
      s.done ? "plain" : k === s.current ? "focus" : "plain";
    out.push({
      badge: s.badge,
      caption: s.caption,
      outcome: s.outcome,
      path: s.path,
      array: arrayOf(
        [
          rowOf(items, {
            label: "input",
            tone: inputTone,
            faded: (k) => s.placed !== undefined && k < s.placed,
          }),
          countRow(counts, values, {
            label: s.countsLabel ?? "counts",
            tone: (k) => (k === s.bump ? "focus" : (s.countsTone ?? "plain")),
            pointers: s.bump === undefined ? [] : [{ label: "+1", index: s.bump }],
          }),
          rowOf(output, {
            label: "output",
            tone: (k) => (s.done ? "good" : k === s.latest ? "focus" : "good"),
          }),
        ],
        scale,
      ),
      counters: [counter(0, "comparisons"), counter(writes, "writes")],
      vars: [],
    });
  };

  push({
    badge: "Start",
    caption: [
      "Count how many times each value appears, then read the sorted order from the counts.",
    ],
    outcome: "good",
    path: [],
  });
  items.forEach((item, k) => {
    counts[item.value - 1] = (counts[item.value - 1] ?? 0) + 1;
    push({
      badge: "Count",
      caption: fill("Count the {v}: its tally goes up by one.", { v: labelOf(item) }),
      outcome: "good",
      path: [0],
      current: k,
      bump: item.value - 1,
    });
  });
  let running = 0;
  for (let k = 0; k < top; k++) {
    const c = counts[k] ?? 0;
    counts[k] = running;
    running += c;
  }
  push({
    badge: "Running totals",
    caption: [
      "Turn the tallies into starting spots: each value begins after all the smaller ones.",
    ],
    outcome: "good",
    path: [1],
    countsLabel: "start spot",
    countsTone: "accent",
  });
  items.forEach((item, k) => {
    const at = counts[item.value - 1] ?? 0;
    output[at] = item;
    counts[item.value - 1] = at + 1;
    writes++;
    push({
      badge: "Place",
      caption: fill("Place {v} at spot {at}, then move that value's start spot along.", {
        v: labelOf(item),
        at: String(at),
      }),
      outcome: "good",
      path: [2],
      current: k,
      placed: k,
      countsLabel: "start spot",
      bump: item.value - 1,
      latest: at,
    });
  });
  push({
    badge: "Done",
    caption: ["Every item is in place. Sorted."],
    outcome: "good",
    path: [],
    countsLabel: "start spot",
    placed: n,
    done: true,
  });
  return out;
}
