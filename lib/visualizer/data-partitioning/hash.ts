import { KEY_SPACE, NODE_LETTERS } from "./types";

export const hashKey = (key: number): number => (37 * key + 11) % KEY_SPACE;

// A is 1, B is 2, and so on.
export const nodeNumber = (letter: string): number => NODE_LETTERS.indexOf(letter) + 1;

// Virtual positions per node, fixed so the shares even out as positions are added; column 0 is the node's own hash.
export const VNODE_TABLE: Record<string, number[]> = {
  A: [48, 88, 1, 45, 94, 35, 73, 13],
  B: [85, 90, 20, 62, 76, 38, 56, 32],
  C: [22, 11, 47, 80, 63, 31, 98, 37],
  D: [59, 87, 26, 97, 52, 82, 68, 4],
  E: [96, 66, 8, 34, 16, 71, 21, 86],
  F: [33, 12, 65, 28, 55, 41, 74, 51],
  G: [70, 0, 42, 39, 46, 19, 25, 29],
  H: [7, 58, 91, 10, 17, 79, 43, 3],
  I: [44, 18, 49, 72, 84, 77, 5, 53],
  J: [81, 40, 99, 69, 75, 78, 92, 54],
};

export interface RingPoint {
  pos: number;
  node: string;
  // Which of the node's positions this is, 0 being its own.
  r: number;
}

export function ringPoints(nodes: string[], vnodes: number): RingPoint[] {
  const out: RingPoint[] = [];
  for (const node of nodes) {
    const row = VNODE_TABLE[node] ?? [];
    for (let r = 0; r < Math.min(vnodes, row.length); r++) {
      out.push({ pos: row[r] as number, node, r });
    }
  }
  return out.sort((a, b) => a.pos - b.pos);
}

// Index of the first point at or clockwise after the hash, wrapping past the last.
export function clockwiseIndex(points: RingPoint[], hash: number): number {
  const i = points.findIndex((p) => p.pos >= hash);
  return i === -1 ? 0 : i;
}

export function ringOwner(points: RingPoint[], hash: number): string {
  const p = points[clockwiseIndex(points, hash)];
  if (!p) throw new Error("ring has no points");
  return p.node;
}

// Each node's percentage of the ring: a point owns the arc back to the previous point.
export function ringShares(points: RingPoint[]): Record<string, number> {
  const out: Record<string, number> = {};
  const n = points.length;
  points.forEach((p, i) => {
    const prev = (points[(i - 1 + n) % n] as RingPoint).pos;
    const arc = n === 1 ? KEY_SPACE : (p.pos - prev + KEY_SPACE) % KEY_SPACE;
    out[p.node] = (out[p.node] ?? 0) + arc;
  });
  return out;
}

export const rendezvousScore = (key: number, letter: string): number => {
  const i = nodeNumber(letter);
  return (hashKey(key) * (2 * i + 1) + 7 * i) % KEY_SPACE;
};
