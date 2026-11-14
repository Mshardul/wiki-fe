import { arrayOf, rowOf } from "../core/array-model";
import type { ArrayModel, ArrayTone, ArrayZone, HeapModel, HeapNode } from "../core/shapes";
import { levelRanges } from "../core/tree";
import type { VarRow } from "../core/types";
import type { HeapEvent, HeapItem } from "./engine";
import { childLine, parentLine } from "./maths";

// What the tree and array need from a run event; Top-K builds one of these too.
export type TreeFrame = Omit<HeapEvent, "badge" | "caption" | "comparisons" | "swaps"> & {
  badge: string;
};

// One tone feeds the tree node and its array bar, so both light up together.
export function toneOf(ev: TreeFrame, k: number): ArrayTone {
  if (k >= ev.sortedFrom) return "good";
  if (ev.node === k) return ev.badge === "In place" ? "good" : "accent";
  if (ev.others.includes(k)) return "focus";
  return "plain";
}

const nodeOf = (item: HeapItem, tone: ArrayTone): HeapNode => ({
  value: item.value,
  tone,
  ...(item.tag ? { tag: item.tag } : {}),
});

export function heapModelOf(
  ev: TreeFrame,
  capacity: number,
  scale: number,
): HeapModel & { array: ArrayModel } {
  const only = ev.others.length === 1 ? ev.others[0] : undefined;
  return {
    kind: "heap",
    nodes: ev.items
      .slice(0, ev.size)
      .map((item, k) => (ev.hole && k === 0 ? null : nodeOf(item, toneOf(ev, k)))),
    capacity,
    lit: ev.node !== null && only !== undefined ? [ev.node, only] : null,
    leaving: ev.leaving ? nodeOf(ev.leaving, "plain") : null,
    array: arrayModelOf(ev, scale, capacity),
  };
}

const padTo = <T>(slots: (T | null)[], n: number): (T | null)[] => [
  ...slots,
  ...Array.from({ length: Math.max(0, n - slots.length) }, () => null),
];

// The array under the tree: level bands over the heap region, a sorted zone after it.
export function arrayModelOf(ev: TreeFrame, scale: number, capacity: number): ArrayModel {
  const slots = padTo(
    ev.items.map((item, k) => (ev.hole && k === 0 ? null : item)),
    capacity,
  );
  const zones: ArrayZone[] = levelRanges(ev.size).map((r) => ({
    from: r.from,
    to: r.to,
    label: `L${r.level}`,
    tone: "plain",
  }));
  if (ev.sortedFrom < ev.items.length) {
    zones.push({ from: ev.sortedFrom, to: ev.items.length - 1, label: "sorted", tone: "good" });
  }
  const rows = [rowOf(slots, { tone: (k) => toneOf(ev, k), zones })];
  if (ev.taken.length > 0) {
    rows.push(
      rowOf(padTo(ev.taken, capacity), {
        label: "taken out",
        tone: () => "good",
        indices: Array.from({ length: capacity }, (_, k) => String(k + 1)),
      }),
    );
  }
  return arrayOf(rows, scale);
}

// The parent or child line for the node in play, shown in the Step tab.
export function mathsVarsOf(ev: TreeFrame): VarRow[] {
  const node = ev.node;
  const other = ev.others[0];
  let lines: string[] = [];
  if (node !== null) {
    if (ev.badge === "Add") lines = [parentLine(node)];
    else if (ev.badge === "Compare" && other !== undefined)
      lines = [other < node ? parentLine(node) : childLine(node, ev.size)];
    else if (ev.badge === "Pick child" || ev.badge === "Move last" || ev.badge === "Place") {
      lines = [childLine(node, ev.size)];
    }
  }
  return lines.map((line) => ({ name: "maths", value: line }));
}
