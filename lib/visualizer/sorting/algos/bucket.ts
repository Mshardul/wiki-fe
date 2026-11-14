import { fill } from "../../core/rich";
import type { ArrayTone } from "../../core/shapes";
import { arrayOf, counter, countRow, labelOf, rowOf, scaleOf } from "../bars";
import type { Item, SortStep } from "../types";

const RANGES = ["1–3", "4–6", "7–9"];
const bucketOf = (value: number): number => Math.min(2, Math.floor((value - 1) / 3));

export function bucketSteps(items: Item[]): SortStep[] {
  let a = items.map((x) => ({ ...x }));
  const n = a.length;
  const scale = Math.max(scaleOf(a, 9), n);
  const lists: Item[][] = RANGES.map(() => []);
  const sortedBuckets = new Set<number>();
  const out: SortStep[] = [];
  let writes = 0;

  const push = (
    s: Pick<SortStep, "badge" | "caption" | "outcome" | "path"> & {
      dropped?: number;
      bump?: number;
      focus?: number;
      collected?: boolean;
      done?: boolean;
    },
  ) => {
    const tone = (k: number): ArrayTone => {
      if (s.done) return "good";
      if (s.collected) return "accent";
      return k === s.dropped ? "focus" : "plain";
    };
    const bucketTone = (k: number): ArrayTone => {
      if (k === s.bump || k === s.focus) return "focus";
      return sortedBuckets.has(k) ? "good" : "plain";
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
          countRow(
            lists.map((l) => l.length),
            RANGES,
            {
              label: "buckets",
              tone: bucketTone,
              pointers: s.bump === undefined ? [] : [{ label: "+1", index: s.bump }],
            },
          ),
        ],
        scale,
      ),
      counters: [counter(0, "comparisons"), counter(writes, "writes")],
      vars: RANGES.map((range, k) => ({
        name: range,
        value: (lists[k] ?? []).map(labelOf).join(", ") || "—",
      })),
    });
  };

  push({
    badge: "Start",
    caption: ["Split the value range into three buckets and drop each item into its own."],
    outcome: "good",
    path: [0],
  });
  const original = a;
  original.forEach((item, k) => {
    const b = bucketOf(item.value);
    (lists[b] as Item[]).push(item);
    writes++;
    push({
      badge: "Drop",
      caption: fill("Drop {v} into the {range} bucket.", {
        v: labelOf(item),
        range: RANGES[b] ?? "",
      }),
      outcome: "good",
      path: [1],
      dropped: k,
      bump: b,
    });
  });
  lists.forEach((list, b) => {
    if (list.length < 2) return;
    const before = list.map(labelOf).join(", ");
    list.sort((x, y) => x.value - y.value);
    sortedBuckets.add(b);
    push({
      badge: "Sort bucket",
      caption: fill("Sort the {range} bucket on its own: {before} becomes {after}.", {
        range: RANGES[b] ?? "",
        before,
        after: list.map(labelOf).join(", "),
      }),
      outcome: "good",
      path: [2],
      dropped: n,
      focus: b,
    });
  });
  a = lists.flat();
  for (const list of lists) list.length = 0;
  sortedBuckets.clear();
  push({
    badge: "Collect",
    caption: ["Collect the buckets in order, smallest range first, into the array."],
    outcome: "good",
    path: [3],
    collected: true,
  });
  push({
    badge: "Done",
    caption: ["Every item is in place. Sorted."],
    outcome: "good",
    path: [],
    done: true,
  });
  return out;
}
