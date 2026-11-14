import { fill } from "../../core/rich";
import type { ArrayTone } from "../../core/shapes";
import { arrayOf, counter, labelOf, rowOf, scaleOf } from "../bars";
import type { Item, SortStep } from "../types";

export function insertionSteps(items: Item[]): SortStep[] {
  const a = items.map((x) => ({ ...x }));
  const n = a.length;
  const scale = scaleOf(a);
  const out: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  const push = (
    s: Pick<SortStep, "badge" | "caption" | "outcome" | "path"> & {
      prefix: number;
      moving?: number;
      focus?: number[];
      pointers?: { label: string; index: number }[];
      done?: boolean;
    },
  ) => {
    const tone = (k: number): ArrayTone => {
      if (s.focus?.includes(k)) return "focus";
      if (k === s.moving) return "accent";
      return k <= s.prefix ? "good" : "plain";
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
            zones: [{ from: 0, to: s.prefix, label: "sorted", tone: "good" }],
          }),
        ],
        scale,
      ),
      counters: [counter(comparisons, "comparisons"), counter(swaps, "swaps")],
      vars: s.done
        ? []
        : [
            { name: "i", value: String(at("i") ?? "—") },
            { name: "j", value: String(at("j") ?? "—") },
          ],
    });
  };

  push({
    badge: "Start",
    caption: ["Everything left of the marker is sorted. Right now that is just the first item."],
    outcome: "good",
    path: [],
    prefix: 0,
  });
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      const left = a[j - 1] as Item;
      const cur = a[j] as Item;
      comparisons++;
      const bigger = left.value > cur.value;
      push({
        badge: "Compare",
        caption: fill(
          bigger
            ? "Compare {l} with {c}: {l} is bigger, so {c} moves left."
            : "Compare {l} with {c}: already in order, so {c} stays here.",
          { l: labelOf(left), c: labelOf(cur) },
        ),
        outcome: "bad",
        path: j === i ? (bigger ? [0, 1] : [0, 1, 3]) : bigger ? [1] : [1, 3],
        prefix: i,
        moving: j,
        focus: [j - 1, j],
        pointers: [
          { label: "i", index: i },
          { label: "j", index: j },
        ],
      });
      if (!bigger) break;
      a[j - 1] = cur;
      a[j] = left;
      swaps++;
      j--;
      push({
        badge: "Swap",
        caption: fill("Swap {c} with {l}.", { c: labelOf(cur), l: labelOf(left) }),
        outcome: "good",
        path: [2],
        prefix: i,
        moving: j,
        pointers: [
          { label: "i", index: i },
          { label: "j", index: j },
        ],
      });
    }
  }
  push({
    badge: "Done",
    caption: ["Every item is in place. Sorted."],
    outcome: "good",
    path: [],
    prefix: n - 1,
    done: true,
  });
  return out;
}
