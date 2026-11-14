import type { Rich } from "../core/rich";

export type NodeState = "unseen" | "frontier" | "current" | "done";
export type EdgeState = "plain" | "tree" | "checking" | "skipped" | "consumed" | "conflict";

export type TraceBadge =
  | "Start"
  | "Enqueue"
  | "Dequeue"
  | "Check"
  | "Discover"
  | "Skip"
  | "Finish"
  | "Push"
  | "Pop"
  | "Relax"
  | "Keep"
  | "Stale"
  | "Count"
  | "Ready"
  | "Take"
  | "Reduce"
  | "Colour"
  | "Fine"
  | "Conflict"
  | "Next component"
  | "Stuck"
  | "Done";

export interface GraphData {
  nodes: string[];
  edges: { from: string; to: string; weight?: number }[];
  directed: boolean;
}

export interface TraceNode {
  state: NodeState;
  order?: number;
  value?: string;
  side?: "a" | "b";
}

export interface PqEntry {
  dist: number;
  node: string;
  seq: number;
}

export interface TraceEvent {
  badge: TraceBadge;
  caption: Rich;
  // The node the step is about, and the neighbour being looked at.
  node: string | null;
  other: string | null;
  nodes: Record<string, TraceNode>;
  edges: Record<string, EdgeState>;
  // Queue, stack (top first) or ready list (front first) of the variant.
  work: string[];
  pq: PqEntry[];
  popped: PqEntry | null;
  // Visit or output order so far.
  order: string[];
  metric: string;
  note: string | null;
  // Nodes the run never reached; set on the last two events.
  unreached: string[];
}

// Undirected edges are keyed by node order joined with "-"; directed ones as "from>to".
export function edgeKey(g: GraphData, a: string, b: string): string {
  if (g.directed) {
    const forward = g.edges.some((e) => e.from === a && e.to === b);
    const backward = g.edges.some((e) => e.from === b && e.to === a);
    return !forward && backward ? `${b}>${a}` : `${a}>${b}`;
  }
  return g.nodes.indexOf(a) <= g.nodes.indexOf(b) ? `${a}-${b}` : `${b}-${a}`;
}

export const edgeKeys = (g: GraphData): string[] => g.edges.map((e) => edgeKey(g, e.from, e.to));

// Holds the live state of a run and snapshots it into one event per step.
export class Recorder {
  readonly events: TraceEvent[] = [];
  nodes: Record<string, TraceNode> = {};
  edges: Record<string, EdgeState> = {};
  work: string[] = [];
  pq: PqEntry[] = [];
  popped: PqEntry | null = null;
  order: string[] = [];
  metric = "";
  note: string | null = null;

  constructor(readonly g: GraphData) {
    for (const n of g.nodes) this.nodes[n] = { state: "unseen" };
    for (const k of edgeKeys(g)) this.edges[k] = "plain";
  }

  key(a: string, b: string): string {
    return edgeKey(this.g, a, b);
  }

  node(id: string): TraceNode {
    const n = this.nodes[id];
    if (!n) throw new Error(`unknown node ${id}`);
    return n;
  }

  emit(badge: TraceBadge, caption: Rich, node: string | null = null, other: string | null = null) {
    this.events.push({
      badge,
      caption,
      node,
      other,
      nodes: Object.fromEntries(Object.entries(this.nodes).map(([k, v]) => [k, { ...v }])),
      edges: { ...this.edges },
      work: [...this.work],
      pq: this.pq.map((p) => ({ ...p })),
      popped: this.popped ? { ...this.popped } : null,
      order: [...this.order],
      metric: this.metric,
      note: this.note,
      unreached: [],
    });
  }

  // Stamps the unreached list on the last two events.
  finish(unreached: string[]): TraceEvent[] {
    for (const ev of this.events.slice(-2)) ev.unreached = [...unreached];
    return this.events;
  }

  unseen(): string[] {
    return this.g.nodes.filter((n) => this.node(n).state === "unseen");
  }
}
