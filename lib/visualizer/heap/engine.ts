import { fill, type Rich } from "../core/rich";
import { childIndexes, parentIndex } from "../core/tree";

export type Order = "min" | "max";

export interface HeapItem {
  value: number;
  tag?: string;
}

export type HeapBadge =
  | "Start"
  | "Add"
  | "Pick child"
  | "Compare"
  | "Swap"
  | "In place"
  | "Take root"
  | "Move last"
  | "Heap built"
  | "Swap root"
  | "Done";

export interface HeapEvent {
  badge: HeapBadge;
  caption: Rich;
  // The whole backing array; indexes from sortedFrom on are final heap sort output.
  items: HeapItem[];
  // Live heap length.
  size: number;
  sortedFrom: number;
  // Index being moved.
  node: number | null;
  // Indexes it is compared with.
  others: number[];
  // Root slot is empty because its item was just taken out.
  hole: boolean;
  leaving: HeapItem | null;
  taken: HeapItem[];
  comparisons: number;
  swaps: number;
}

export interface HeapCore {
  a: HeapItem[];
  size: number;
  order: Order;
  comparisons: number;
  swaps: number;
}

export type Emit = (badge: HeapBadge, caption: Rich, node: number | null, others: number[]) => void;

export const labelOf = (item: HeapItem): string => `${item.value}${item.tag ?? ""}`;

// Strict, so equal items never swap.
export const beats = (order: Order, a: HeapItem, b: HeapItem): boolean =>
  order === "min" ? a.value < b.value : a.value > b.value;

const at = (a: HeapItem[], i: number): HeapItem => {
  const item = a[i];
  if (!item) throw new Error(`no heap item at ${i}`);
  return item;
};

function swap(h: HeapCore, i: number, j: number): void {
  const x = at(h.a, i);
  h.a[i] = at(h.a, j);
  h.a[j] = x;
  h.swaps++;
}

export function siftUp(h: HeapCore, start: number, emit: Emit): void {
  let i = start;
  while (i > 0) {
    const p = parentIndex(i);
    const n = labelOf(at(h.a, i));
    const par = labelOf(at(h.a, p));
    const up = beats(h.order, at(h.a, i), at(h.a, p));
    h.comparisons++;
    emit(
      "Compare",
      fill(
        up
          ? "Compare {n} with its parent {p}: {n} belongs higher."
          : "Compare {n} with its parent {p}: {n} stays below.",
        { n, p: par },
      ),
      i,
      [p],
    );
    if (!up) {
      emit("In place", fill("{n} is in place. The heap order holds.", { n }), i, []);
      return;
    }
    swap(h, i, p);
    emit("Swap", fill("Swap {n} with its parent {p}.", { n, p: par }), p, []);
    i = p;
  }
}

export function siftDown(h: HeapCore, start: number, emit: Emit): void {
  let i = start;
  for (;;) {
    const kids = childIndexes(i, h.size);
    const first = kids[0];
    if (first === undefined) return;
    let c = first;
    const second = kids[1];
    if (second !== undefined) {
      const x = at(h.a, first);
      const y = at(h.a, second);
      const pickSecond = beats(h.order, y, x);
      c = pickSecond ? second : first;
      h.comparisons++;
      emit(
        "Pick child",
        fill("Pick the child that belongs higher: {w}, over {l}.", {
          w: labelOf(pickSecond ? y : x),
          l: labelOf(pickSecond ? x : y),
        }),
        i,
        [first, second],
      );
    }
    const n = labelOf(at(h.a, i));
    const child = labelOf(at(h.a, c));
    const down = beats(h.order, at(h.a, c), at(h.a, i));
    h.comparisons++;
    emit(
      "Compare",
      fill(
        down
          ? "Compare {n} with its child {c}: {c} belongs higher."
          : "Compare {n} with its child {c}: {n} stays.",
        { n, c: child },
      ),
      i,
      [c],
    );
    if (!down) {
      emit("In place", fill("{n} is in place. The heap order holds.", { n }), i, []);
      return;
    }
    swap(h, i, c);
    emit("Swap", fill("Swap {n} with its child {c}.", { n, c: child }), c, []);
    i = c;
  }
}

interface Run {
  h: HeapCore;
  out: HeapEvent[];
  sortedFrom: number;
  taken: HeapItem[];
  hole: boolean;
  quiet: boolean;
}

function newRun(items: HeapItem[], order: Order, size = items.length): Run {
  return {
    h: { a: items.map((x) => ({ ...x })), size, order, comparisons: 0, swaps: 0 },
    out: [],
    sortedFrom: items.length,
    taken: [],
    hole: false,
    quiet: false,
  };
}

function emitter(r: Run): Emit {
  return (badge, caption, node, others) => {
    if (r.quiet) return;
    r.out.push({
      badge,
      caption,
      items: r.h.a.map((x) => ({ ...x })),
      size: r.h.size,
      sortedFrom: r.sortedFrom,
      node,
      others,
      hole: r.hole,
      leaving: null,
      taken: [...r.taken],
      comparisons: r.h.comparisons,
      swaps: r.h.swaps,
    });
  };
}

function buildInPlace(r: Run, emit: Emit): void {
  for (let i = Math.floor(r.h.size / 2) - 1; i >= 0; i--) siftDown(r.h, i, emit);
}

export function insertRun(items: HeapItem[], order: Order): HeapEvent[] {
  const r = newRun([], order);
  const emit = emitter(r);
  emit("Start", fill("The heap is empty. Add the values one at a time.", {}), null, []);
  for (const item of items) {
    r.h.a.push({ ...item });
    r.h.size++;
    r.sortedFrom = r.h.a.length;
    const i = r.h.a.length - 1;
    emit("Add", fill("Add {v} in the next free spot, at the bottom.", { v: labelOf(item) }), i, []);
    siftUp(r.h, i, emit);
  }
  emit("Done", fill("All values are added and the heap order holds.", {}), null, []);
  return r.out;
}

export function extractRun(items: HeapItem[], order: Order): HeapEvent[] {
  const r = newRun(items, order);
  r.quiet = true;
  buildInPlace(r, emitter(r));
  r.quiet = false;
  const h = r.h;
  r.h.comparisons = 0;
  r.h.swaps = 0;
  const emit = emitter(r);
  emit(
    "Start",
    fill("A finished heap. Take the top item out, then repair the heap.", {}),
    null,
    [],
  );
  const root = at(h.a, 0);
  r.taken.push(root);
  r.hole = true;
  emit("Take root", fill("Take the top item {r} out.", { r: labelOf(root) }), 0, []);
  const events = r.out;
  events[events.length - 1] = { ...(events[events.length - 1] as HeapEvent), leaving: root };
  r.hole = false;
  if (h.a.length > 1) {
    const last = h.a.pop() as HeapItem;
    h.size--;
    h.a[0] = last;
    r.sortedFrom = h.a.length;
    emit(
      "Move last",
      fill("Move the last item {l} to the top to fill the gap.", { l: labelOf(last) }),
      0,
      [],
    );
    siftDown(h, 0, emit);
  } else {
    h.a.pop();
    h.size = 0;
  }
  emit("Done", fill("The heap order holds again.", {}), null, []);
  return r.out;
}

export function buildRun(items: HeapItem[], order: Order): HeapEvent[] {
  const r = newRun(items, order);
  const emit = emitter(r);
  emit("Start", fill("An unsorted tree. Fix it from the last parent upward.", {}), null, []);
  buildInPlace(r, emit);
  emit("Done", fill("The heap is built.", {}), null, []);
  return r.out;
}

export function heapsortRun(items: HeapItem[], order: Order): HeapEvent[] {
  const r = newRun(items, order);
  const emit = emitter(r);
  const h = r.h;
  emit(
    "Start",
    fill("Unsorted. First build a heap, then pull the top item out one by one.", {}),
    null,
    [],
  );
  buildInPlace(r, emit);
  emit(
    "Heap built",
    fill("The heap is built. The top item is the {w}.", {
      w: order === "max" ? "biggest" : "smallest",
    }),
    null,
    [],
  );
  for (let end = h.a.length - 1; end >= 1; end--) {
    const top = labelOf(at(h.a, 0));
    const last = labelOf(at(h.a, end));
    swap(h, 0, end);
    h.size = end;
    r.sortedFrom = end;
    emit(
      "Swap root",
      fill("Swap the top {t} with the last heap item {l}. {t} is now in its final place.", {
        t: top,
        l: last,
      }),
      0,
      [],
    );
    siftDown(h, 0, emit);
  }
  h.size = 0;
  r.sortedFrom = 0;
  emit("Done", fill("Every item is in place. Sorted.", {}), null, []);
  return r.out;
}

export function insertCost(
  items: HeapItem[],
  order: Order,
): { comparisons: number; swaps: number } {
  const last = insertRun(items, order).at(-1);
  return { comparisons: last?.comparisons ?? 0, swaps: last?.swaps ?? 0 };
}
