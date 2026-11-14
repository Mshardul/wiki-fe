import { mulberry32 } from "../core/rng";
import type { GraphData } from "./trace";

export const PRESET_IDS = [
  "small",
  "weighted",
  "dag",
  "dag-cycle",
  "ring-even",
  "ring-odd",
] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export type Coords = Record<string, { x: number; y: number }>;
export interface GraphPreset {
  data: GraphData;
  coords: Coords;
}

const undirected = (nodes: string, pairs: [string, string, number?][]): GraphData => ({
  nodes: nodes.split(""),
  edges: pairs.map(([from, to, weight]) =>
    weight === undefined ? { from, to } : { from, to, weight },
  ),
  directed: false,
});

const DAG_EDGES: [string, string][] = [
  ["A", "C"],
  ["B", "C"],
  ["B", "D"],
  ["C", "E"],
  ["D", "E"],
  ["E", "F"],
];
const DAG_COORDS: Coords = {
  A: { x: 0, y: 1 },
  B: { x: 0, y: 3 },
  C: { x: 1.6, y: 1 },
  D: { x: 1.6, y: 3 },
  E: { x: 3.2, y: 2 },
  F: { x: 4.8, y: 2 },
};
const directed = (nodes: string, pairs: [string, string][]): GraphData => ({
  nodes: nodes.split(""),
  edges: pairs.map(([from, to]) => ({ from, to })),
  directed: true,
});

export const PRESETS: Record<PresetId, GraphPreset> = {
  small: {
    data: undirected("ABCDEFGH", [
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
      ["B", "E"],
      ["C", "F"],
      ["E", "G"],
      ["F", "G"],
      ["G", "H"],
    ]),
    coords: {
      A: { x: 0, y: 2 },
      B: { x: 1, y: 0.7 },
      C: { x: 1, y: 3.3 },
      D: { x: 2, y: 0 },
      E: { x: 2.3, y: 1.4 },
      F: { x: 2.3, y: 3.1 },
      G: { x: 3.5, y: 2.3 },
      H: { x: 4.7, y: 2.3 },
    },
  },
  weighted: {
    data: undirected("ABCDE", [
      ["A", "B", 4],
      ["A", "C", 2],
      ["B", "C", 1],
      ["B", "D", 5],
      ["C", "D", 8],
      ["C", "E", 10],
      ["D", "E", 2],
    ]),
    coords: {
      A: { x: 0, y: 2 },
      B: { x: 1.5, y: 0 },
      C: { x: 1.5, y: 4 },
      D: { x: 3.5, y: 0 },
      E: { x: 5, y: 4 },
    },
  },
  dag: { data: directed("ABCDEF", DAG_EDGES), coords: DAG_COORDS },
  "dag-cycle": { data: directed("ABCDEF", [...DAG_EDGES, ["F", "C"]]), coords: DAG_COORDS },
  "ring-even": {
    data: undirected("ABCDEF", [
      ["A", "B"],
      ["B", "C"],
      ["C", "D"],
      ["D", "E"],
      ["E", "F"],
      ["F", "A"],
    ]),
    coords: {
      A: { x: 1.5, y: 0 },
      B: { x: 3, y: 0.75 },
      C: { x: 3, y: 2.25 },
      D: { x: 1.5, y: 3 },
      E: { x: 0, y: 2.25 },
      F: { x: 0, y: 0.75 },
    },
  },
  "ring-odd": {
    data: undirected("ABCDE", [
      ["A", "B"],
      ["B", "C"],
      ["C", "D"],
      ["D", "E"],
      ["E", "A"],
    ]),
    coords: {
      A: { x: 1.5, y: 0 },
      B: { x: 3, y: 1.1 },
      C: { x: 2.4, y: 3 },
      D: { x: 0.6, y: 3 },
      E: { x: 0, y: 1.1 },
    },
  },
};

export type MiniId = "bfs" | "dfs" | "dijkstra" | "topo" | "bipartite";
export interface Mini extends GraphPreset {
  start: string;
}

const SQUARE: Coords = {
  A: { x: 0, y: 1 },
  B: { x: 1.2, y: 0 },
  C: { x: 1.2, y: 2 },
  D: { x: 2.4, y: 1 },
};
const SQUARE_EDGES: [string, string][] = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["C", "D"],
];

// Small graphs for the Revision cards, one per variant.
export const MINIS: Record<MiniId, Mini> = {
  bfs: { data: undirected("ABCD", SQUARE_EDGES), coords: SQUARE, start: "A" },
  dfs: { data: undirected("ABCD", SQUARE_EDGES), coords: SQUARE, start: "A" },
  dijkstra: {
    data: undirected("ABC", [
      ["A", "B", 1],
      ["B", "C", 2],
      ["A", "C", 4],
    ]),
    coords: { A: { x: 0, y: 1.6 }, B: { x: 1.6, y: 0 }, C: { x: 3.2, y: 1.6 } },
    start: "A",
  },
  topo: {
    data: directed("ABCD", [
      ["A", "C"],
      ["B", "C"],
      ["C", "D"],
    ]),
    coords: {
      A: { x: 0, y: 0 },
      B: { x: 0, y: 2 },
      C: { x: 1.6, y: 1 },
      D: { x: 3.2, y: 1 },
    },
    start: "A",
  },
  bipartite: {
    data: undirected("ABC", [
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
    ]),
    coords: { A: { x: 1, y: 0 }, B: { x: 2, y: 1.7 }, C: { x: 0, y: 1.7 } },
    start: "A",
  },
};

// Drops duplicate edges (a-b equals b-a when undirected), keeping the lower weight.
export function normalise(g: GraphData): GraphData {
  const seen = new Map<string, number>();
  const edges: GraphData["edges"] = [];
  for (const e of g.edges) {
    const [a, b] = g.directed || e.from <= e.to ? [e.from, e.to] : [e.to, e.from];
    const key = `${a}|${b}`;
    const at = seen.get(key);
    if (at === undefined) {
      seen.set(key, edges.length);
      edges.push({ ...e });
      continue;
    }
    const kept = edges[at];
    if (kept && e.weight !== undefined && (kept.weight === undefined || e.weight < kept.weight)) {
      kept.weight = e.weight;
    }
  }
  return { ...g, edges };
}

export interface Neighbour {
  node: string;
  weight: number;
}

// Seed 0 keeps declaration order; any other seed shuffles this node's list once, stably.
export function neighboursOf(g: GraphData, node: string, seed: number): Neighbour[] {
  const out: Neighbour[] = [];
  for (const e of g.edges) {
    const weight = e.weight ?? 1;
    if (e.from === node) out.push({ node: e.to, weight });
    else if (!g.directed && e.to === node) out.push({ node: e.from, weight });
  }
  out.sort((x, y) => g.nodes.indexOf(x.node) - g.nodes.indexOf(y.node));
  if (seed === 0) return out;
  const rng = mulberry32(
    (Math.imul(seed, 0x9e3779b1) + Math.imul(g.nodes.indexOf(node) + 1, 0x85ebca6b)) >>> 0,
  );
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a && b) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}
