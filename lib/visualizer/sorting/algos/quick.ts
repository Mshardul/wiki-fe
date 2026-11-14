import { fill } from "../../core/rich";
import type { ArrayTone, ArrayZone } from "../../core/shapes";
import { arrayOf, counter, labelOf, rowOf, scaleOf } from "../bars";
import type { Item, SortStep } from "../types";

interface Frame extends Pick<SortStep, "badge" | "caption" | "outcome" | "path"> {
  lo: number;
  hi: number;
  // Last index of the smaller side (lo - 1 when empty).
  i: number;
  // Index being looked at.
  j: number;
  // First index not looked at yet.
  seen: number;
  pivot: number;
  focus?: number[];
  pointers: { label: string; index: number }[];
  placed?: boolean;
}

export function quickSteps(items: Item[]): SortStep[] {
  const a = items.map((x) => ({ ...x }));
  const n = a.length;
  const scale = scaleOf(a);
  const settled = new Set<number>();
  const out: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  const push = (f: Frame) => {
    const { lo, hi, i, seen } = f;
    const tone = (k: number): ArrayTone => {
      if (f.focus?.includes(k)) return "focus";
      if (settled.has(k)) return "good";
      if (k < lo || k > hi) return "plain";
      if (k === f.pivot) return "accent";
      if (f.placed) return k < f.pivot ? "good" : "warn";
      if (k <= i) return "good";
      return k < seen ? "warn" : "plain";
    };
    const zones: ArrayZone[] = f.placed
      ? [
          { from: lo, to: f.pivot - 1, label: "< pivot", tone: "good" },
          { from: f.pivot + 1, to: hi, label: "≥ pivot", tone: "warn" },
        ]
      : [
          { from: lo, to: i, label: "< pivot", tone: "good" },
          { from: i + 1, to: seen - 1, label: "≥ pivot", tone: "warn" },
          { from: seen, to: hi - 1, label: "not looked at", tone: "plain" },
        ];
    out.push({
      badge: f.badge,
      caption: f.caption,
      outcome: f.outcome,
      path: f.path,
      array: arrayOf([rowOf(a, { tone, pointers: f.pointers, zones })], scale),
      counters: [counter(comparisons, "comparisons"), counter(swaps, "swaps")],
      vars: [
        { name: "range", value: `${lo}–${hi}` },
        { name: "pivot", value: String(a[f.pivot]?.value ?? "—") },
        { name: "j", value: f.placed ? "—" : String(f.j) },
      ],
    });
  };

  const bare = (badge: string, caption: SortStep["caption"], path: number[]) => {
    out.push({
      badge,
      caption,
      outcome: "good",
      path,
      array: arrayOf([rowOf(a, { tone: () => (badge === "Done" ? "good" : "plain") })], scale),
      counters: [counter(comparisons, "comparisons"), counter(swaps, "swaps")],
      vars: [],
    });
  };

  const sort = (lo: number, hi: number, whole: boolean) => {
    if (lo > hi) return;
    if (lo === hi) {
      settled.add(lo);
      return;
    }
    const pivot = a[hi] as Item;
    let i = lo - 1;
    push({
      badge: "Pick pivot",
      caption: fill("Pick the last item, {p}, as the pivot.", { p: labelOf(pivot) }),
      outcome: "bad",
      path: whole ? [0] : [3, 0],
      lo,
      hi,
      i,
      j: lo,
      seen: lo,
      pivot: hi,
      pointers: [
        { label: "j", index: lo },
        { label: "pivot", index: hi },
      ],
    });
    for (let j = lo; j < hi; j++) {
      const cur = a[j] as Item;
      comparisons++;
      const smaller = cur.value < pivot.value;
      const base = { lo, hi, j, pivot: hi };
      push({
        ...base,
        i,
        seen: j,
        badge: "Compare",
        caption: fill(
          smaller
            ? "Compare {c} with the pivot {p}: smaller, so it belongs in front."
            : "Compare {c} with the pivot {p}: not smaller, so it stays behind.",
          { c: labelOf(cur), p: labelOf(pivot) },
        ),
        outcome: "bad",
        path: [1],
        focus: [j],
        pointers: [
          ...(i >= lo ? [{ label: "i", index: i }] : []),
          { label: "j", index: j },
          { label: "pivot", index: hi },
        ],
      });
      if (!smaller) continue;
      i++;
      if (i === j) continue;
      const other = a[i] as Item;
      a[i] = cur;
      a[j] = other;
      swaps++;
      push({
        ...base,
        i,
        seen: j + 1,
        badge: "Swap",
        caption: fill("Swap {c} forward, past {o}.", { c: labelOf(cur), o: labelOf(other) }),
        outcome: "good",
        path: [1],
        pointers: [
          { label: "i", index: i },
          { label: "j", index: j },
          { label: "pivot", index: hi },
        ],
      });
    }
    const p = i + 1;
    if (p !== hi) {
      a[hi] = a[p] as Item;
      a[p] = pivot;
      swaps++;
    }
    settled.add(p);
    if (p - lo === 1) settled.add(lo);
    if (hi - p === 1) settled.add(hi);
    push({
      lo,
      hi,
      i,
      j: hi,
      seen: hi,
      pivot: p,
      badge: "Place pivot",
      caption: fill("Place the pivot {p} between the smaller and larger items.", {
        p: labelOf(pivot),
      }),
      outcome: "good",
      path: [2],
      pointers: [{ label: "pivot", index: p }],
      placed: true,
    });
    sort(lo, p - 1, false);
    sort(p + 1, hi, false);
  };

  bare("Start", ["Pick a pivot, split the items around it, then repeat on each side."], []);
  sort(0, n - 1, true);
  bare("Done", ["Every item is in place. Sorted."], []);
  return out;
}
