import { counter } from "../../core/array-model";
import { heapsortPath } from "../../heap/defs";
import { heapsortRun } from "../../heap/engine";
import { arrayModelOf, heapModelOf } from "../../heap/view";
import { scaleOf } from "../bars";
import type { Item, SortStep } from "../types";

const MOVES = new Set(["Swap", "Swap root"]);

// Max-heap sort through the shared heap engine; the tree with its array is the picture.
export function heapSteps(items: Item[]): SortStep[] {
  const events = heapsortRun(items, "max");
  const pathOf = heapsortPath(events);
  const scale = scaleOf(items);
  const capacity = items.length;
  return events.map((ev, i) => ({
    badge: ev.badge,
    caption: ev.caption,
    outcome: ev.badge === "Start" || ev.badge === "Done" || MOVES.has(ev.badge) ? "good" : "bad",
    path: pathOf(ev, i),
    array: arrayModelOf(ev, scale, capacity),
    picture: heapModelOf(ev, capacity, scale),
    counters: [counter(ev.comparisons, "comparisons"), counter(ev.swaps, "swaps")],
    vars: [
      { name: "node", value: ev.node === null ? "—" : String(ev.node) },
      { name: "size", value: String(ev.size) },
    ],
  }));
}
