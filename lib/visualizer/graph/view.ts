import type {
  ArrayTone,
  GraphEdge,
  GraphEdgeState,
  GraphModel,
  GraphNode,
  HeapModel,
  HeapNode,
  LeafModel,
  LinearModel,
  ShapeModel,
} from "../core/shapes";
import type { Placed } from "./layout";
import { type EdgeState, edgeKey, type GraphData, type NodeState, type TraceEvent } from "./trace";
import type { GraphId } from "./types";

export interface ViewCtx {
  g: GraphData;
  placed: Placed;
  layered: boolean;
  // Row index of each node in the layered picture (hops from the start).
  hops: Record<string, number>;
  // The most entries the priority queue ever holds, which fixes its layout.
  pqCapacity: number;
}

export interface PictureOptions {
  compact?: boolean;
  settled?: boolean;
}

export function toneOf(state: NodeState, isOther: boolean): ArrayTone {
  if (isOther) return "focus";
  if (state === "frontier") return "warn";
  if (state === "current") return "accent";
  if (state === "done") return "good";
  return "plain";
}

const EDGE: Record<EdgeState, GraphEdgeState> = {
  plain: "plain",
  tree: "tree",
  checking: "checking",
  skipped: "skipped",
  consumed: "consumed",
  conflict: "flash",
};

// BFS outlines the row the current node is filling; nothing else does.
export function outlineRow(
  variant: GraphId,
  ev: TraceEvent,
  hops: Record<string, number>,
): number | null {
  if (variant !== "bfs" || ev.badge === "Start" || ev.badge === "Done") return null;
  if (ev.badge === "Enqueue") return 0;
  return ev.node === null ? null : (hops[ev.node] ?? 0) + 1;
}

export function graphModelOf(
  ev: TraceEvent,
  g: GraphData,
  placed: Placed,
  opts: { layered: boolean; outlineRow: number | null; settled: boolean; weights: boolean },
): GraphModel {
  const nodes: GraphNode[] = g.nodes.map((id) => {
    const mark = ev.nodes[id] ?? { state: "unseen" as const };
    const at = placed.pos[id] ?? { x: 0, y: 0 };
    return {
      id,
      label: id,
      x: at.x,
      y: at.y,
      tone: toneOf(mark.state, ev.other === id),
      ...(opts.layered && mark.state === "unseen" ? { faded: true } : {}),
      ...(mark.order !== undefined ? { order: mark.order } : {}),
      ...(mark.value !== undefined ? { badge: mark.value } : {}),
      ...(mark.side ? { side: mark.side } : {}),
    };
  });
  const edges: GraphEdge[] = g.edges.map((e) => ({
    from: e.from,
    to: e.to,
    state: EDGE[ev.edges[edgeKey(g, e.from, e.to)] ?? "plain"],
    directed: g.directed,
    ...(opts.weights && e.weight !== undefined ? { label: String(e.weight) } : {}),
  }));
  return {
    kind: "graph",
    nodes,
    edges,
    rows: placed.rows.map((r) => ({
      ...r,
      ...(r.y === opts.outlineRow ? { outlined: true } : {}),
    })),
    cols: placed.cols,
    height: placed.height,
    settled: opts.settled,
  };
}

interface StripOptions {
  active?: string | null;
  removed?: string | null;
}

function strip(
  items: string[],
  capacity: number,
  labels: LinearModel["labels"],
  o: StripOptions = {},
): LinearModel {
  return {
    kind: "linear",
    items,
    capacity: Math.max(1, capacity),
    next: null,
    active: o.active ?? null,
    tone: o.active ? "new" : null,
    removed: o.removed ?? null,
    labels,
    defaultAxis: "horizontal",
  };
}

// The newest entry sits at the entry end, so a queue is drawn back to front.
const queueStrip = (ev: TraceEvent, n: number, o: StripOptions): LinearModel =>
  strip([...ev.work].reverse(), n, { entry: "in", exit: "out" }, o);

const orderStrip = (ev: TraceEvent, n: number, grew: boolean): LinearModel =>
  strip(
    ev.order,
    n,
    { entry: "first", exit: "latest" },
    {
      active: grew ? (ev.order[ev.order.length - 1] ?? null) : null,
    },
  );

function heapPartOf(ev: TraceEvent, capacity: number): HeapModel {
  const newest =
    ev.badge === "Push" || ev.badge === "Relax" ? Math.max(...ev.pq.map((p) => p.seq)) : -1;
  const nodes: HeapNode[] = ev.pq.map((p) => ({
    value: p.dist,
    tone: p.seq === newest ? "accent" : "plain",
    tag: p.node,
  }));
  return {
    kind: "heap",
    nodes,
    capacity: Math.max(1, capacity),
    lit: null,
    leaving: ev.popped
      ? {
          value: ev.popped.dist,
          tone: ev.badge === "Stale" ? "plain" : "good",
          tag: ev.popped.node,
        }
      : null,
  };
}

const ORDER_GROWS: Record<GraphId, string> = {
  bfs: "Dequeue",
  dfs: "Push",
  dijkstra: "Pop",
  topo: "Take",
  bipartite: "",
};

export function pictureOf(
  variant: GraphId,
  ev: TraceEvent,
  ctx: ViewCtx,
  options: PictureOptions = {},
): ShapeModel {
  const n = ctx.g.nodes.length;
  const graph = graphModelOf(ev, ctx.g, ctx.placed, {
    layered: ctx.layered,
    outlineRow: outlineRow(variant, ev, ctx.hops),
    settled: options.settled === true,
    weights: variant === "dijkstra",
  });
  const order = orderStrip(ev, n, ev.badge === ORDER_GROWS[variant]);
  const parts: LeafModel[] = [graph];
  if (variant === "bfs") {
    const active = ev.badge === "Enqueue" ? ev.node : ev.badge === "Discover" ? ev.other : null;
    const removed = ev.badge === "Dequeue" ? ev.node : null;
    parts.push(queueStrip(ev, n, { active, removed }), order);
  } else if (variant === "dfs") {
    parts.push(
      strip(
        ev.work,
        n,
        { entry: "top", exit: "bottom" },
        {
          active: ev.badge === "Push" ? ev.node : null,
          removed: ev.badge === "Pop" ? ev.node : null,
        },
      ),
      order,
    );
  } else if (variant === "dijkstra") {
    parts.push(heapPartOf(ev, ctx.pqCapacity), order);
  } else if (variant === "topo") {
    const active = ev.badge === "Ready" ? (ev.other ?? ev.node) : null;
    const removed = ev.badge === "Take" ? ev.node : null;
    parts.push(
      strip([...ev.work].reverse(), n, { entry: "in", exit: "take" }, { active, removed }),
      order,
    );
  } else {
    const active =
      ev.badge === "Colour" || ev.badge === "Next component" ? (ev.other ?? ev.node) : null;
    const removed = ev.badge === "Dequeue" ? ev.node : null;
    parts.push(queueStrip(ev, n, { active, removed }));
  }
  const kept = options.compact ? parts.slice(0, 2) : parts;
  return { kind: "composite", parts: kept };
}
