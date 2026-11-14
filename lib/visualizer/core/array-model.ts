import type { ArrayBar, ArrayModel, ArrayPointer, ArrayRow, ArrayTone, ArrayZone } from "./shapes";

export interface RowOpts {
  label?: string;
  tone?: (index: number) => ArrayTone;
  faded?: (index: number) => boolean;
  indices?: string[];
  pointers?: ArrayPointer[];
  zones?: ArrayZone[];
  next?: number;
}

interface Slot {
  value: number;
  tag?: string;
}

export function rowOf(items: (Slot | null)[], o: RowOpts = {}): ArrayRow {
  const bars = items.map((item, i): ArrayBar | null => {
    if (!item) return null;
    const bar: ArrayBar = { value: item.value, tone: o.tone?.(i) ?? "plain" };
    if (item.tag) bar.tag = item.tag;
    if (o.faded?.(i)) bar.faded = true;
    return bar;
  });
  const row: ArrayRow = {
    bars,
    indices: o.indices ?? items.map((_, i) => String(i)),
    pointers: o.pointers ?? [],
    zones: (o.zones ?? []).filter((z) => z.to >= z.from),
  };
  if (o.label) row.label = o.label;
  if (o.next !== undefined) row.next = o.next;
  return row;
}

export const arrayOf = (rows: ArrayRow[], scale: number): ArrayModel => ({
  kind: "array",
  rows,
  scale,
});

// A row of plain counts: one bar per slot, the bar height is how many items it holds.
export function countRow(
  counts: number[],
  indices: string[],
  o: Omit<RowOpts, "indices"> = {},
): ArrayRow {
  return rowOf(
    counts.map((c) => ({ value: c })),
    { ...o, indices },
  );
}

export const counter = (value: number, label: string): { value: string; label: string } => ({
  value: String(value),
  label,
});
