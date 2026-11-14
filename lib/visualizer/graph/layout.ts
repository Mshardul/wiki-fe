import type { Coords } from "./graphs";
import type { Row } from "./layers";

export type LayoutKind = "node-link" | "layered";

export interface Placed {
  pos: Record<string, { x: number; y: number }>;
  rows: { y: number; label?: string }[];
  cols: number;
  height: number;
}

// Hand-laid coordinates, no row bands.
export function placeNodeLink(coords: Coords): Placed {
  const pts = Object.values(coords);
  return {
    pos: Object.fromEntries(Object.entries(coords).map(([k, v]) => [k, { ...v }])),
    rows: [],
    cols: Math.max(0, ...pts.map((p) => p.x)),
    height: Math.max(0, ...pts.map((p) => p.y)),
  };
}

// One row per level, each centred across the widest row at one cell spacing.
export function placeLayered(rows: Row[]): Placed {
  const widest = Math.max(1, ...rows.map((r) => r.nodes.length));
  const cols = Math.max(2, widest - 1);
  const pos: Placed["pos"] = {};
  rows.forEach((row, y) => {
    const start = (cols - (row.nodes.length - 1)) / 2;
    row.nodes.forEach((n, i) => {
      pos[n] = { x: start + i, y };
    });
  });
  return {
    pos,
    rows: rows.map((r, y) => (r.label ? { y, label: r.label } : { y })),
    cols,
    height: Math.max(0, rows.length - 1),
  };
}
