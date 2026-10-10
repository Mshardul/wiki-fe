import { describe, expect, it } from "vitest";
import { FLOW_HALF, type FlowEdge, type FlowNode, flowLayout } from "./flow";

const NODES: FlowNode[] = [
  { id: "app", kind: "client", label: "App" },
  { id: "cache", kind: "buffer", label: "Cache" },
  { id: "db", kind: "store", label: "DB" },
];

const edge = (from: string, to: string, step: number): FlowEdge => ({
  from,
  to,
  step,
  style: "solid",
});

describe("flowLayout", () => {
  it("spreads nodes evenly on one row", () => {
    const { nodes } = flowLayout(NODES, []);
    expect(nodes.map((n) => n.x)).toEqual([50, 150, 250]);
    expect(new Set(nodes.map((n) => n.y)).size).toBe(1);
  });

  it("draws an edge between neighbours as a straight horizontal line", () => {
    const { nodes, edges } = flowLayout(NODES, [edge("app", "cache", 1)]);
    const [e] = edges;
    expect(e?.d.startsWith("M ")).toBe(true);
    expect(e?.d).toContain(" L ");
    expect(e?.by).toBe(nodes[0]?.y);
  });

  it("separates parallel edges between the same pair", () => {
    const { edges } = flowLayout(NODES, [
      edge("app", "cache", 1),
      edge("cache", "app", 2),
      edge("app", "cache", 3),
    ]);
    expect(new Set(edges.map((e) => e.by)).size).toBe(3);
  });

  it("arcs an edge that skips a node above the row, the return arc higher than the outbound", () => {
    const { nodes, edges } = flowLayout(NODES, [edge("app", "db", 1), edge("db", "app", 2)]);
    const rowY = nodes[0]?.y ?? 0;
    const [out, back] = edges;
    expect(out?.d).toContain(" Q ");
    expect(out?.by).toBeLessThan(rowY - FLOW_HALF);
    expect(back?.by).toBeLessThan(out?.by ?? 0);
  });

  it("keeps every edge in input order with its step, style and label", () => {
    const { edges } = flowLayout(NODES, [
      { from: "app", to: "cache", step: 1, style: "dotted", label: "miss" },
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ step: 1, style: "dotted", label: "miss" });
  });

  it("ignores an edge that names an unknown node and tolerates no nodes", () => {
    expect(flowLayout(NODES, [edge("app", "ghost", 1)]).edges).toEqual([]);
    expect(flowLayout([], [edge("a", "b", 1)])).toEqual({ nodes: [], edges: [] });
  });
});
