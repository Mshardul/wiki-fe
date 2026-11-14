import { neighboursOf } from "./graphs";
import type { GraphData } from "./trace";

export interface Row {
  nodes: string[];
  label?: "not reached" | "stuck";
}

// Every node a neighbour in either direction, so rows can be ordered against the row above.
function linked(g: GraphData): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const n of g.nodes) out[n] = new Set();
  for (const e of g.edges) {
    out[e.from]?.add(e.to);
    out[e.to]?.add(e.from);
  }
  return out;
}

// Orders each row by the average column of its neighbours in the row above, ties by declaration order.
function order(g: GraphData, levels: string[][]): string[][] {
  const near = linked(g);
  const placed: string[][] = [];
  levels.forEach((level, r) => {
    const prev = placed[r - 1];
    if (!prev) {
      placed.push([...level].sort((a, b) => g.nodes.indexOf(a) - g.nodes.indexOf(b)));
      return;
    }
    const bary = (n: string): number => {
      const cols = prev.flatMap((p, i) => (near[n]?.has(p) ? [i] : []));
      return cols.length ? cols.reduce((a, b) => a + b, 0) / cols.length : Number.POSITIVE_INFINITY;
    };
    placed.push(
      [...level].sort((a, b) => bary(a) - bary(b) || g.nodes.indexOf(a) - g.nodes.indexOf(b)),
    );
  });
  return placed;
}

const lastRow = (g: GraphData, nodes: string[], label: Row["label"]): Row[] =>
  nodes.length
    ? [{ nodes: [...nodes].sort((a, b) => g.nodes.indexOf(a) - g.nodes.indexOf(b)), label }]
    : [];

// Rows by hops from the start; nodes it cannot reach go in a last row.
export function hopRows(g: GraphData, start: string): Row[] {
  const hop = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const x = queue.shift() as string;
    for (const nb of neighboursOf(g, x, 0)) {
      if (!hop.has(nb.node)) {
        hop.set(nb.node, (hop.get(x) ?? 0) + 1);
        queue.push(nb.node);
      }
    }
  }
  const levels: string[][] = [];
  for (const [n, h] of hop) (levels[h] ??= []).push(n);
  const rows = order(g, levels).map((nodes) => ({ nodes }));
  return [
    ...rows,
    ...lastRow(
      g,
      g.nodes.filter((n) => !hop.has(n)),
      "not reached",
    ),
  ];
}

// Rows by longest path from the sources; nodes Kahn never frees go in a last row.
export function longestRows(g: GraphData): Row[] {
  const indeg = new Map<string, number>(g.nodes.map((n) => [n, 0]));
  for (const n of g.nodes) {
    for (const nb of neighboursOf(g, n, 0)) indeg.set(nb.node, (indeg.get(nb.node) ?? 0) + 1);
  }
  const level = new Map<string, number>();
  const ready = g.nodes.filter((n) => indeg.get(n) === 0);
  for (const n of ready) level.set(n, 0);
  while (ready.length) {
    const x = ready.shift() as string;
    for (const nb of neighboursOf(g, x, 0)) {
      level.set(nb.node, Math.max(level.get(nb.node) ?? 0, (level.get(x) ?? 0) + 1));
      indeg.set(nb.node, (indeg.get(nb.node) ?? 0) - 1);
      if (indeg.get(nb.node) === 0) ready.push(nb.node);
    }
  }
  const levels: string[][] = [];
  for (const n of g.nodes) {
    const l = level.get(n);
    if (l !== undefined && indeg.get(n) === 0) (levels[l] ??= []).push(n);
  }
  const rows = order(
    g,
    levels.filter((l) => l.length > 0),
  ).map((nodes) => ({ nodes }));
  return [
    ...rows,
    ...lastRow(
      g,
      g.nodes.filter((n) => indeg.get(n) !== 0),
      "stuck",
    ),
  ];
}
