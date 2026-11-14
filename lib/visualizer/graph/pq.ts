import type { PqEntry } from "./trace";

type Swaps = [number, number][];

// Smaller distance first; equal distances pop in push order.
const before = (a: PqEntry, b: PqEntry): boolean =>
  a.dist < b.dist || (a.dist === b.dist && a.seq < b.seq);

function swap(h: PqEntry[], i: number, j: number, swaps: Swaps): void {
  const a = h[i];
  const b = h[j];
  if (!a || !b) return;
  h[i] = b;
  h[j] = a;
  swaps.push([i, j]);
}

export function pqPush(items: PqEntry[], entry: PqEntry): { items: PqEntry[]; swaps: Swaps } {
  const h = [...items, entry];
  const swaps: Swaps = [];
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    const a = h[i];
    const b = h[p];
    if (!a || !b || !before(a, b)) break;
    swap(h, i, p, swaps);
    i = p;
  }
  return { items: h, swaps };
}

export function pqPop(items: PqEntry[]): { top: PqEntry; items: PqEntry[]; swaps: Swaps } {
  const top = items[0];
  if (!top) throw new Error("pop from an empty queue");
  const h = items.slice(0, -1);
  const last = items[items.length - 1];
  const swaps: Swaps = [];
  if (h.length > 0 && last) {
    h[0] = last;
    let i = 0;
    for (;;) {
      let m = i;
      for (const c of [2 * i + 1, 2 * i + 2]) {
        const a = h[c];
        const b = h[m];
        if (a && b && before(a, b)) m = c;
      }
      if (m === i) break;
      swap(h, i, m, swaps);
      i = m;
    }
  }
  return { top, items: h, swaps };
}
