import { fill } from "../../core/rich";
import type { ArrayTone } from "../../core/shapes";
import { arrayOf, counter, countRow, labelOf, rowOf, scaleOf } from "../bars";
import type { Item, SortStep } from "../types";

const DIGITS = Array.from({ length: 10 }, (_, d) => String(d));
const PASS_NAMES = ["ones", "tens", "hundreds"];

export function radixSteps(items: Item[]): SortStep[] {
  let a = items.map((x) => ({ ...x }));
  const n = a.length;
  const top = Math.max(...a.map((i) => i.value));
  const passes = String(top).length;
  const scale = Math.max(scaleOf(a), n);
  const out: SortStep[] = [];
  let writes = 0;

  const push = (
    s: Pick<SortStep, "badge" | "caption" | "outcome" | "path"> & {
      pass: number;
      buckets: number[];
      dropped?: number;
      bump?: number;
      collected?: boolean;
      done?: boolean;
    },
  ) => {
    const tone = (k: number): ArrayTone => {
      if (s.done) return "good";
      if (s.collected) return "accent";
      return k === s.dropped ? "focus" : "plain";
    };
    out.push({
      badge: s.badge,
      caption: s.caption,
      outcome: s.outcome,
      path: s.path,
      array: arrayOf(
        [
          rowOf(a, {
            tone,
            faded: (k) => s.dropped !== undefined && k < s.dropped,
          }),
          countRow(s.buckets, DIGITS, {
            label: `${PASS_NAMES[s.pass] ?? "next"} digit buckets`,
            tone: (k) => (k === s.bump ? "focus" : "plain"),
            pointers: s.bump === undefined ? [] : [{ label: "+1", index: s.bump }],
          }),
        ],
        scale,
      ),
      counters: [counter(0, "comparisons"), counter(writes, "writes")],
      vars: [{ name: "digit", value: PASS_NAMES[s.pass] ?? "next" }],
    });
  };

  push({
    badge: "Start",
    caption: ["Sort by one digit at a time, starting with the ones digit."],
    outcome: "good",
    path: [],
    pass: 0,
    buckets: new Array<number>(10).fill(0),
  });
  for (let pass = 0; pass < passes; pass++) {
    const unit = 10 ** pass;
    const lists: Item[][] = DIGITS.map(() => []);
    const name = PASS_NAMES[pass] ?? "next";
    a.forEach((item, k) => {
      const d = Math.floor(item.value / unit) % 10;
      (lists[d] as Item[]).push(item);
      writes++;
      push({
        badge: "Drop",
        caption: fill("Drop {v} into bucket {d}, its {name} digit.", {
          v: labelOf(item),
          d: String(d),
          name,
        }),
        outcome: "good",
        path: [0, 1],
        pass,
        dropped: k,
        bump: d,
        buckets: lists.map((l) => l.length),
      });
    });
    a = lists.flat();
    const last = pass === passes - 1;
    push({
      badge: "Collect",
      caption: ["Collect the buckets in order, 0 first, back into the array."],
      outcome: "good",
      path: [2],
      pass,
      collected: last,
      buckets: new Array<number>(10).fill(0),
    });
  }
  push({
    badge: "Done",
    caption: ["Every item is in place. Sorted."],
    outcome: "good",
    path: [],
    pass: passes - 1,
    done: true,
    buckets: new Array<number>(10).fill(0),
  });
  return out;
}
