import type { BinsModel } from "./shapes";

export const BIN_W = 52;
export const BIN_GAP = 12;
export const BIN_HEAD_H = 46;
export const BIN_CELL_H = 24;
export const BIN_PAD = 12;

export interface PlacedItem {
  id: string;
  bin: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BinsLayout {
  width: number;
  height: number;
  binX: number[];
  items: PlacedItem[];
}

const cellsOf = (heavy: boolean | undefined): number => (heavy ? 2 : 1);

// Items stack from the bottom of their bin, in the order given.
export function binsLayout(model: BinsModel): BinsLayout {
  const n = model.bins.length;
  const slots = Math.max(1, model.slots);
  const width = n * BIN_W + Math.max(0, n - 1) * BIN_GAP + 2 * BIN_PAD;
  const stackH = slots * BIN_CELL_H;
  const height = BIN_HEAD_H + stackH + BIN_PAD;
  const binX = model.bins.map((_, i) => BIN_PAD + i * (BIN_W + BIN_GAP));
  const bottom = BIN_HEAD_H + stackH;
  const items: PlacedItem[] = [];
  model.bins.forEach((bin, b) => {
    let used = 0;
    for (const item of bin.items) {
      const cells = cellsOf(item.heavy);
      used += cells;
      items.push({
        id: item.id,
        bin: b,
        x: (binX[b] as number) + 4,
        y: bottom - used * BIN_CELL_H + 2,
        w: BIN_W - 8,
        h: cells * BIN_CELL_H - 4,
      });
    }
  });
  return { width, height, binX, items };
}

// The tallest stack, in cells, over several models: one height for the whole run.
export function tallestStack(bins: { items: { heavy?: boolean }[] }[]): number {
  return Math.max(1, ...bins.map((b) => b.items.reduce((sum, i) => sum + cellsOf(i.heavy), 0)));
}
