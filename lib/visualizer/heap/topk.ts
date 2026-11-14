import { fill, type Rich } from "../core/rich";
import {
  beats,
  type HeapBadge,
  type HeapCore,
  type HeapItem,
  labelOf,
  type Order,
  siftDown,
  siftUp,
} from "./engine";

export type TopKBadge = HeapBadge | "Read" | "Check root" | "Skip" | "Evict" | "Place";

export interface TopKEvent {
  badge: TopKBadge;
  caption: Rich;
  heap: HeapItem[];
  // Values not read yet.
  stream: HeapItem[];
  reading: HeapItem | null;
  skipped: HeapItem | null;
  leaving: HeapItem | null;
  // Root slot is empty because its item was just evicted.
  hole: boolean;
  node: number | null;
  others: number[];
  comparisons: number;
  evictions: number;
}

const opposite = (order: Order): Order => (order === "min" ? "max" : "min");

// Min order keeps the K largest values, max order keeps the K smallest.
export function topKRun(items: HeapItem[], k: number, order: Order): TopKEvent[] {
  const h: HeapCore = { a: [], size: 0, order, comparisons: 0, swaps: 0 };
  const out: TopKEvent[] = [];
  let stream = items.map((x) => ({ ...x }));
  let reading: HeapItem | null = null;
  let skipped: HeapItem | null = null;
  let leaving: HeapItem | null = null;
  let hole = false;
  let evictions = 0;

  const emit = (badge: TopKBadge, caption: Rich, node: number | null, others: number[]) =>
    out.push({
      badge,
      caption,
      heap: h.a.map((x) => ({ ...x })),
      stream: stream.map((x) => ({ ...x })),
      reading,
      skipped,
      leaving,
      hole,
      node,
      others,
      comparisons: h.comparisons,
      evictions,
    });

  const kept = order === "min" ? "largest" : "smallest";
  emit(
    "Start",
    fill(`Keep the ${k} ${kept} values from the stream in a small heap.`, {}),
    null,
    [],
  );
  for (const item of items) {
    stream = stream.slice(1);
    reading = item;
    skipped = null;
    emit("Read", fill("Read {v} from the stream.", { v: labelOf(item) }), null, []);
    if (h.size < k) {
      h.a.push({ ...item });
      h.size++;
      reading = null;
      emit(
        "Add",
        fill("The heap has room, so add {v} at the bottom.", { v: labelOf(item) }),
        h.size - 1,
        [],
      );
      siftUp(h, h.size - 1, emit);
      continue;
    }
    const root = h.a[0] as HeapItem;
    const wins = beats(opposite(order), item, root);
    h.comparisons++;
    emit(
      "Check root",
      fill(
        wins
          ? "Compare {v} with the root {r}: {v} beats it, so it earns a place."
          : "Compare {v} with the root {r}: {v} does not beat it.",
        { v: labelOf(item), r: labelOf(root) },
      ),
      0,
      [],
    );
    if (!wins) {
      reading = null;
      skipped = item;
      emit(
        "Skip",
        fill("Skip {v}. The heap keeps its {k}.", { v: labelOf(item), k: kept }),
        null,
        [],
      );
      continue;
    }
    leaving = root;
    hole = true;
    evictions++;
    emit("Evict", fill("Evict the root {r} to make room.", { r: labelOf(root) }), 0, []);
    leaving = null;
    hole = false;
    reading = null;
    h.a[0] = { ...item };
    emit("Place", fill("Place {v} at the root.", { v: labelOf(item) }), 0, []);
    siftDown(h, 0, emit);
  }
  skipped = null;
  emit("Done", fill(`The heap holds the ${k} ${kept} values.`, {}), null, []);
  return out;
}
