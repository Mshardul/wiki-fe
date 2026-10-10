export const COLS_4_MIN = 1090;
export const COLS_3_MIN = 810;
export const COLS_2_MIN = 540;

export function maxColsFor(width: number): number {
  if (width >= COLS_4_MIN) return 4;
  if (width >= COLS_3_MIN) return 3;
  if (width >= COLS_2_MIN) return 2;
  return 1;
}

// Fewest rows that fit, then as even as possible with the longer rows first; short rows are centred by the caller.
export function layoutRows(n: number, maxCols: number): number[] {
  const count = Math.floor(n);
  if (!Number.isFinite(count) || count <= 0) return [];
  const cols = Number.isFinite(maxCols) && maxCols >= 1 ? Math.floor(maxCols) : 1;
  const rows = Math.ceil(count / cols);
  const base = Math.floor(count / rows);
  const extra = count % rows;
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
}
