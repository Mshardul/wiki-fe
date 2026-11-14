import type { VarRow } from "../core/types";
import { bfsRun } from "./bfs";
import { bipartiteRun } from "./bipartite";
import { COPY } from "./copy";
import { dfsRun } from "./dfs";
import { dijkstraRun } from "./dijkstra";
import { normalise, PRESETS } from "./graphs";
import { hopRows, longestRows } from "./layers";
import { type LayoutKind, placeLayered, placeNodeLink } from "./layout";
import { topoRun } from "./topo";
import type { GraphData, TraceEvent } from "./trace";
import {
  GRAPH_IDS,
  type GraphDef,
  type GraphId,
  type GraphInput,
  type GraphStep,
  type StepOptions,
} from "./types";
import { pictureOf, type ViewCtx } from "./view";

export const LAYOUT: Record<GraphId, LayoutKind> = {
  bfs: "layered",
  dfs: "node-link",
  dijkstra: "node-link",
  topo: "layered",
  bipartite: "node-link",
};

const GOOD = new Set([
  "Start",
  "Done",
  "Enqueue",
  "Dequeue",
  "Discover",
  "Push",
  "Pop",
  "Relax",
  "Take",
  "Reduce",
  "Ready",
  "Colour",
  "Next component",
  "Count",
  "Finish",
]);

const PATHS: Record<GraphId, Record<string, number[]>> = {
  bfs: { Enqueue: [2], Dequeue: [0], Check: [1], Skip: [1], Discover: [2], Finish: [3] },
  dfs: { Push: [0], Check: [1], Skip: [1], Pop: [2] },
  dijkstra: { Push: [2], Pop: [0], Check: [1], Keep: [1], Relax: [2], Stale: [3] },
  topo: { Count: [0], Take: [2], Reduce: [2] },
  bipartite: { Dequeue: [1], Check: [1], Fine: [1], Conflict: [2], "Next component": [0] },
};

function pathOf(id: GraphId, ev: TraceEvent): number[] {
  if (id === "topo" && ev.badge === "Ready") return [ev.order.length === 0 ? 1 : 3];
  if (id === "bipartite" && ev.badge === "Colour")
    return [ev.node !== null && ev.other === null ? 0 : 1];
  return PATHS[id][ev.badge] ?? [];
}

const dash = (v: string | null): string => v ?? "—";
const row = (name: string, value: string): VarRow => ({ name, value });

function varsOf(id: GraphId, ev: TraceEvent, g: GraphData, ctx: ViewCtx): VarRow[] {
  const node = ev.node;
  if (id === "bfs") {
    return [
      row("current", dash(node)),
      row("hops", node === null ? "—" : String(ctx.hops[node] ?? 0)),
      row("queue", String(ev.work.length)),
    ];
  }
  if (id === "dfs") return [row("current", dash(node)), row("depth", String(ev.work.length))];
  if (id === "dijkstra") {
    const out = [row("current", dash(node)), row("queue", String(ev.pq.length))];
    if (ev.badge === "Check" && node !== null && ev.other !== null) {
      const edge = g.edges.find(
        (e) => (e.from === node && e.to === ev.other) || (e.to === node && e.from === ev.other),
      );
      const now = ev.nodes[node]?.value ?? "∞";
      const old = ev.nodes[ev.other]?.value ?? "∞";
      out.push(row("route", `${now} + ${edge?.weight ?? 1} vs ${old}`));
    }
    return out;
  }
  if (id === "topo") {
    const out = [row("ready", String(ev.work.length)), row("output", String(ev.order.length))];
    if (ev.badge === "Reduce" && ev.other !== null) {
      out.push(row(`in-degree of ${ev.other}`, ev.nodes[ev.other]?.value ?? "—"));
    }
    return out;
  }
  const sides = (s: "a" | "b") => g.nodes.filter((n) => ev.nodes[n]?.side === s).join(" ") || "—";
  const mine = node === null ? undefined : ev.nodes[node]?.side;
  return [
    row("current side", mine === undefined ? "—" : mine === "a" ? "colour 1" : "colour 2"),
    row("colour 1", sides("a")),
    row("colour 2", sides("b")),
  ];
}

function runOf(id: GraphId, g: GraphData, start: string, seed: number): TraceEvent[] {
  if (id === "bfs") return bfsRun(g, start, seed);
  if (id === "dfs") return dfsRun(g, start, seed);
  if (id === "dijkstra") return dijkstraRun(g, start, seed);
  if (id === "topo") return topoRun(g, seed);
  return bipartiteRun(g, start, seed);
}

function stepsOf(id: GraphId, input: GraphInput, options: StepOptions = {}): GraphStep[] {
  const world = options.world ?? PRESETS[input.preset];
  const g = normalise(world.data);
  const start = g.nodes.includes(input.start) ? input.start : (g.nodes[0] ?? "A");
  const events = runOf(id, g, start, input.seed);
  const rows = id === "bfs" ? hopRows(g, start) : id === "topo" ? longestRows(g) : null;
  const hops: Record<string, number> = {};
  if (id === "bfs" && rows) rows.forEach((r, y) => r.nodes.forEach((n) => (hops[n] = y)));
  const ctx: ViewCtx = {
    g,
    placed: rows ? placeLayered(rows) : placeNodeLink(world.coords),
    layered: rows !== null,
    hops,
    pqCapacity: Math.max(1, ...events.map((e) => e.pq.length)),
  };
  return events.map((ev, i) => ({
    badge: ev.badge,
    caption: ev.caption,
    model: pictureOf(id, ev, ctx, {
      compact: options.compact === true,
      settled: i === events.length - 1,
    }),
    metric: ev.metric,
    outcome: GOOD.has(ev.badge) ? "good" : "bad",
    vars: varsOf(id, ev, g, ctx),
    path: pathOf(id, ev),
  }));
}

function defOf(id: GraphId): GraphDef {
  const { name, chip, rule, lines, about, tries, articleHref, metricLabel } = COPY[id];
  return {
    id,
    name,
    chip,
    rule,
    lines,
    about,
    tries,
    articleHref,
    metricLabel,
    steps: (input, options) => stepsOf(id, input, options),
  };
}

export const DEFS = Object.fromEntries(GRAPH_IDS.map((id) => [id, defOf(id)])) as Record<
  GraphId,
  GraphDef
>;
