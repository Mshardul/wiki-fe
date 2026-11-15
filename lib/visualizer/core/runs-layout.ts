import type { RunsModel } from "./shapes";

export const RUN_CELL_W = 36;
export const RUN_CELL_H = 34;
export const RUN_GAP = 4;
export const RUN_BRACE_H = 62;
export const RUN_PAD = 12;

export interface PlacedCell {
  id: string;
  x: number;
  w: number;
}
export interface PlacedBrace {
  x: number;
  w: number;
}
export interface RunsLayout {
  width: number;
  height: number;
  cells: PlacedCell[];
  braces: PlacedBrace[];
}

const cellW = (heavy: boolean | undefined): number =>
  heavy ? 2 * RUN_CELL_W + RUN_GAP : RUN_CELL_W;

// Cells sit in one row; an empty brace reserves a placeholder slot before the cell it points at.
export function runsLayout(model: RunsModel): RunsLayout {
  const empties = new Map<number, number[]>();
  model.braces.forEach((b, i) => {
    if (b.from > b.to) empties.set(b.from, [...(empties.get(b.from) ?? []), i]);
  });
  const cells: PlacedCell[] = [];
  const holes = new Map<number, number>();
  let x = RUN_PAD;
  const place = (at: number) => {
    for (const hole of empties.get(at) ?? []) {
      holes.set(hole, x);
      x += RUN_CELL_W + RUN_GAP;
    }
  };
  model.cells.forEach((c, i) => {
    place(i);
    const w = cellW(c.heavy);
    cells.push({ id: c.id, x, w });
    x += w + RUN_GAP;
  });
  place(model.cells.length);
  const width = Math.max(x - RUN_GAP + RUN_PAD, 2 * RUN_PAD + RUN_CELL_W);
  const braces = model.braces.map((b, i) => {
    if (b.from > b.to) return { x: holes.get(i) ?? RUN_PAD, w: RUN_CELL_W };
    const first = cells[b.from] as PlacedCell;
    const last = cells[b.to] as PlacedCell;
    return { x: first.x, w: last.x + last.w - first.x };
  });
  return { width, height: RUN_CELL_H + RUN_BRACE_H + 2 * RUN_PAD, cells, braces };
}
