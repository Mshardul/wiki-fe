import { fill } from "../../core/rich";
import type { ArrayTone, ArrayZone } from "../../core/shapes";
import { arrayOf, counter, labelOf, rowOf, scaleOf } from "../bars";
import type { Item, SortStep } from "../types";

interface View {
  badge: string;
  caption: SortStep["caption"];
  outcome: SortStep["outcome"];
  path: number[];
  lo: number;
  hi: number;
  // Merge in progress: what has been taken so far and where the two cursors are.
  merged?: Item[];
  taken?: Set<number>;
  left?: number;
  right?: number;
  mid?: number;
  focus?: number[];
  zones?: ArrayZone[];
  copied?: boolean;
  done?: boolean;
}

export function mergeSteps(items: Item[]): SortStep[] {
  const a = items.map((x) => ({ ...x }));
  const n = a.length;
  const scale = scaleOf(a);
  const sorted = new Array<boolean>(n).fill(false);
  const out: SortStep[] = [];
  let comparisons = 0;
  let writes = 0;

  const push = (v: View) => {
    const tone = (k: number): ArrayTone => {
      if (v.done) return "good";
      if (v.focus?.includes(k)) return "focus";
      if (v.copied && k >= v.lo && k <= v.hi) return "accent";
      return sorted[k] ? "good" : "plain";
    };
    const pointers = [
      ...(v.left !== undefined && v.mid !== undefined && v.left <= v.mid
        ? [{ label: "L", index: v.left }]
        : []),
      ...(v.right !== undefined && v.right <= v.hi ? [{ label: "R", index: v.right }] : []),
    ];
    const merged = v.merged ?? [];
    const aux: (Item | null)[] = a.map((_, k) =>
      k >= v.lo && k - v.lo < merged.length ? (merged[k - v.lo] as Item) : null,
    );
    const auxNext = v.merged && merged.length <= v.hi - v.lo ? v.lo + merged.length : undefined;
    out.push({
      badge: v.badge,
      caption: v.caption,
      outcome: v.outcome,
      path: v.path,
      array: arrayOf(
        [
          rowOf(a, {
            tone,
            faded: (k) => v.taken?.has(k) ?? false,
            pointers,
            zones: v.zones,
          }),
          rowOf(aux, {
            label: "merged so far",
            tone: () => "good",
            next: auxNext,
          }),
        ],
        scale,
      ),
      counters: [counter(comparisons, "comparisons"), counter(writes, "writes")],
      vars: v.merged
        ? [
            { name: "L", value: String(v.left ?? "—") },
            { name: "R", value: String(v.right ?? "—") },
            { name: "merged", value: String(merged.length) },
          ]
        : [{ name: "range", value: `${v.lo}–${v.hi}` }],
    });
  };

  const merge = (lo: number, mid: number, hi: number) => {
    const merged: Item[] = [];
    const taken = new Set<number>();
    let l = lo;
    let r = mid + 1;
    const view = (over: Partial<View>): View => ({
      badge: "",
      caption: [],
      outcome: "good",
      path: [],
      lo,
      hi,
      mid,
      merged: [...merged],
      taken: new Set(taken),
      left: l,
      right: r,
      ...over,
    });
    const take = (from: number, side: "left" | "right", why: string) => {
      const item = a[from] as Item;
      merged.push(item);
      taken.add(from);
      writes++;
      if (side === "left") l++;
      else r++;
      push(
        view({
          badge: "Take",
          caption: fill(`Take {c} ${why}.`, { c: labelOf(item) }),
          path: [2],
        }),
      );
    };
    while (l <= mid && r <= hi) {
      const x = a[l] as Item;
      const y = a[r] as Item;
      comparisons++;
      const leftWins = x.value <= y.value;
      push(
        view({
          badge: "Compare",
          caption: fill(
            leftWins
              ? "Compare the front items {x} and {y}: {x} is smaller or equal."
              : "Compare the front items {x} and {y}: {y} is smaller.",
            { x: labelOf(x), y: labelOf(y) },
          ),
          outcome: "bad",
          path: [1],
          focus: [l, r],
        }),
      );
      take(leftWins ? l : r, leftWins ? "left" : "right", "into the merged row");
    }
    while (l <= mid) take(l, "left", "(the rest of the left half)");
    while (r <= hi) take(r, "right", "(the rest of the right half)");
    merged.forEach((item, k) => {
      a[lo + k] = item;
    });
    for (let k = lo; k <= hi; k++) sorted[k] = true;
    push({
      badge: "Copy back",
      caption: ["Copy the merged row back over this part of the array."],
      outcome: "good",
      path: [3],
      lo,
      hi,
      copied: true,
    });
  };

  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid = lo + Math.ceil((hi - lo + 1) / 2) - 1;
    push({
      badge: "Split",
      caption: fill("Split positions {a} to {b} into a left and a right half.", {
        a: String(lo),
        b: String(hi),
      }),
      outcome: "bad",
      path: [0],
      lo,
      hi,
      zones: [
        { from: lo, to: mid, label: "left", tone: "plain" },
        { from: mid + 1, to: hi, label: "right", tone: "plain" },
      ],
    });
    sort(lo, mid);
    sort(mid + 1, hi);
    merge(lo, mid, hi);
  };

  push({
    badge: "Start",
    caption: ["Split until every piece is one item, then merge the pieces back in order."],
    outcome: "good",
    path: [],
    lo: 0,
    hi: n - 1,
  });
  sort(0, n - 1);
  push({
    badge: "Done",
    caption: ["Every item is in place. Sorted."],
    outcome: "good",
    path: [],
    lo: 0,
    hi: n - 1,
    done: true,
  });
  return out;
}
