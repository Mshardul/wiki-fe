import { fill } from "../../core/rich";
import type { ArrayTone } from "../../core/shapes";
import { arrayOf, counter, labelOf, rowOf, scaleOf } from "../bars";
import type { Item, SortStep } from "../types";

export function selectionSteps(items: Item[]): SortStep[] {
  const a = items.map((x) => ({ ...x }));
  const n = a.length;
  const scale = scaleOf(a);
  const out: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  const push = (
    s: Pick<SortStep, "badge" | "caption" | "outcome" | "path"> & {
      sorted: number;
      min?: number;
      focus?: number[];
      pointers?: { label: string; index: number }[];
    },
  ) => {
    const tone = (k: number): ArrayTone => {
      if (s.focus?.includes(k)) return "focus";
      if (k === s.min) return "accent";
      return k < s.sorted ? "good" : "plain";
    };
    const pointers = s.pointers ?? [];
    const at = (label: string) => pointers.find((p) => p.label === label)?.index;
    out.push({
      badge: s.badge,
      caption: s.caption,
      outcome: s.outcome,
      path: s.path,
      array: arrayOf(
        [
          rowOf(a, {
            tone,
            pointers,
            zones: [{ from: 0, to: s.sorted - 1, label: "sorted", tone: "good" }],
          }),
        ],
        scale,
      ),
      counters: [counter(comparisons, "comparisons"), counter(swaps, "swaps")],
      vars: pointers.length
        ? [
            { name: "i", value: String(at("i") ?? "—") },
            { name: "j", value: String(at("j") ?? "—") },
            { name: "min", value: String(at("min") ?? "—") },
          ]
        : [],
    });
  };

  push({
    badge: "Start",
    caption: ["Nothing is sorted yet. Find the smallest item and put it first."],
    outcome: "good",
    path: [],
    sorted: 0,
  });
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      const cur = a[j] as Item;
      const best = a[min] as Item;
      comparisons++;
      const smaller = cur.value < best.value;
      push({
        badge: "Compare",
        caption: fill(
          smaller
            ? "Compare {c} with the smallest so far, {b}: {c} is smaller."
            : "Compare {c} with the smallest so far, {b}: not smaller.",
          { c: labelOf(cur), b: labelOf(best) },
        ),
        outcome: "bad",
        path: [0],
        sorted: i,
        min,
        focus: [j, min],
        pointers: [
          { label: "i", index: i },
          { label: "j", index: j },
          { label: "min", index: min },
        ],
      });
      if (smaller) {
        min = j;
        push({
          badge: "New min",
          caption: fill("{c} is the new smallest.", { c: labelOf(cur) }),
          outcome: "bad",
          path: [1],
          sorted: i,
          min,
          pointers: [
            { label: "i", index: i },
            { label: "j", index: j },
            { label: "min", index: min },
          ],
        });
      }
    }
    if (min !== i) {
      const first = a[i] as Item;
      const smallest = a[min] as Item;
      a[i] = smallest;
      a[min] = first;
      swaps++;
      push({
        badge: "Swap",
        caption: fill("Swap {s} into the first open spot, past {f}.", {
          s: labelOf(smallest),
          f: labelOf(first),
        }),
        outcome: "good",
        path: [2],
        sorted: i + 1,
        pointers: [
          { label: "i", index: i },
          { label: "min", index: min },
        ],
      });
    }
  }
  push({
    badge: "Done",
    caption: ["Every item is in place. Sorted."],
    outcome: "good",
    path: [],
    sorted: n,
  });
  return out;
}
