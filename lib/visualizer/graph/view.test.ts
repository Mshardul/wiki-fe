import { describe, expect, it } from "vitest";
import type { GraphModel, HeapModel, LinearModel, ShapeModel } from "../core/shapes";
import { DEFS } from "./defs";
import { MINIS, PRESETS } from "./graphs";
import type { GraphId, GraphInput } from "./types";

const input = (algo: GraphId, preset: GraphInput["preset"], start = "A", seed = 0): GraphInput => ({
  algo,
  preset,
  start,
  seed,
});

function parts(model: ShapeModel) {
  if (model.kind !== "composite") throw new Error("expected composite");
  const [graph, ...rest] = model.parts;
  if (graph?.kind !== "graph") throw new Error("expected graph first");
  return { graph, rest };
}

const tone = (g: GraphModel, id: string) => g.nodes.find((n) => n.id === id)?.tone;

describe("BFS picture on the small graph", () => {
  const steps = DEFS.bfs.steps(input("bfs", "small"));
  const at = (badge: string, n: number) => steps.filter((s) => s.badge === badge)[n - 1];

  it("rings the neighbour being checked and outlines the next row", () => {
    const { graph } = parts((at("Check", 1) as { model: ShapeModel }).model);
    expect(tone(graph, "A")).toBe("accent");
    expect(tone(graph, "B")).toBe("focus");
    expect(graph.edges.find((e) => e.from === "A" && e.to === "B")?.state).toBe("checking");
    expect(graph.rows.find((r) => r.outlined)?.y).toBe(1);
  });

  it("outlines row 3 when D is the current node", () => {
    const d = steps.find(
      (s) =>
        s.badge === "Dequeue" && s.caption.some((p) => typeof p !== "string" && p.text === "D"),
    );
    expect(parts((d as { model: ShapeModel }).model).graph.rows.find((r) => r.outlined)?.y).toBe(3);
  });

  it("fades unseen nodes in the layered picture", () => {
    const { graph } = parts(steps[0]?.model as ShapeModel);
    expect(graph.nodes.every((n) => n.faded === true)).toBe(true);
  });

  it("stacks the graph, the queue and the visited row", () => {
    const { rest } = parts(steps[0]?.model as ShapeModel);
    expect(rest.map((p) => p.kind)).toEqual(["linear", "linear"]);
  });
});

describe("DFS picture", () => {
  it("does not fade unseen nodes", () => {
    const steps = DEFS.dfs.steps(input("dfs", "small"));
    const { graph } = parts(steps[0]?.model as ShapeModel);
    expect(graph.nodes.some((n) => n.faded)).toBe(false);
    expect(graph.rows).toEqual([]);
  });
});

describe("Dijkstra picture on the weighted graph", () => {
  const steps = DEFS.dijkstra.steps(input("dijkstra", "weighted"));
  const badgeOf = (g: GraphModel, id: string) => g.nodes.find((n) => n.id === id)?.badge;

  it("shows B at infinity, then 4, then 3", () => {
    const seen: (string | undefined)[] = [];
    for (const s of steps) {
      const b = badgeOf(parts(s.model).graph, "B");
      if (b !== seen[seen.length - 1]) seen.push(b);
    }
    expect(seen).toEqual(["∞", "4", "3"]);
  });

  it("draws the queue as a tree-only heap with a ghost on Pop and Stale", () => {
    const heapOf = (i: number) =>
      parts((steps[i] as { model: ShapeModel }).model).rest[0] as HeapModel;
    expect(heapOf(0).kind).toBe("heap");
    expect(heapOf(0).array).toBeUndefined();
    const popA = steps.findIndex((s) => s.badge === "Pop");
    expect(heapOf(popA).leaving?.value).toBe(0);
    const stale = steps.findIndex((s) => s.badge === "Stale");
    expect(heapOf(stale).leaving?.value).toBe(4);
    expect(heapOf(stale).leaving?.tag).toBe("B");
  });

  it("fixes the heap capacity for the whole run at 4", () => {
    const caps = new Set(steps.map((s) => (parts(s.model).rest[0] as HeapModel).capacity));
    expect([...caps]).toEqual([4]);
  });

  it("labels the edges with their weights", () => {
    expect(parts(steps[0]?.model as ShapeModel).graph.edges.map((e) => e.label)).toEqual([
      "4",
      "2",
      "1",
      "5",
      "8",
      "10",
      "2",
    ]);
  });
});

describe("topological sort picture", () => {
  const steps = DEFS.topo.steps(input("topo", "dag"));

  it("follows the in-degree badges and marks reduced edges consumed", () => {
    const seq: (string | undefined)[] = [];
    for (const s of steps) {
      const b = parts(s.model).graph.nodes.find((n) => n.id === "C")?.badge;
      if (b !== undefined && b !== seq[seq.length - 1]) seq.push(b);
    }
    expect(seq).toEqual(["2", "1", "0"]);
    const last = parts((steps[steps.length - 1] as { model: ShapeModel }).model).graph;
    expect(last.edges.every((e) => e.state === "consumed")).toBe(true);
  });

  it("is layered with a ready list and an output row", () => {
    const { graph, rest } = parts(steps[0]?.model as ShapeModel);
    expect(graph.rows).toHaveLength(4);
    expect(rest.map((p) => (p as LinearModel).labels.exit)).toEqual(["take", "latest"]);
  });
});

describe("bipartite picture", () => {
  it("fills two sides and flashes the conflicting edge", () => {
    const even = DEFS.bipartite.steps(input("bipartite", "ring-even"));
    const end = parts((even[even.length - 1] as { model: ShapeModel }).model).graph;
    const side = (s: "a" | "b") =>
      end.nodes
        .filter((n) => n.side === s)
        .map((n) => n.id)
        .join("");
    expect([side("a"), side("b")]).toEqual(["ACE", "BDF"]);
    const odd = DEFS.bipartite.steps(input("bipartite", "ring-odd"));
    const conflict = odd.find((s) => s.badge === "Conflict");
    const g = parts((conflict as { model: ShapeModel }).model).graph;
    expect(g.edges.filter((e) => e.state === "flash").map((e) => `${e.from}${e.to}`)).toEqual([
      "CD",
    ]);
  });
});

describe("every picture", () => {
  const cases: [GraphId, GraphInput["preset"]][] = [
    ["bfs", "small"],
    ["dfs", "small"],
    ["dijkstra", "weighted"],
    ["topo", "dag"],
    ["bipartite", "ring-odd"],
  ];

  it("keeps node positions identical in every frame", () => {
    for (const [id, preset] of cases) {
      const steps = DEFS[id].steps(input(id, preset));
      const pos = (s: { model: ShapeModel }) =>
        JSON.stringify(parts(s.model).graph.nodes.map((n) => [n.id, n.x, n.y]));
      const first = pos(steps[0] as { model: ShapeModel });
      for (const s of steps) expect(pos(s)).toBe(first);
    }
  });

  it("marks only the last frame settled", () => {
    for (const [id, preset] of cases) {
      const steps = DEFS[id].steps(input(id, preset));
      steps.forEach((s, i) => expect(parts(s.model).graph.settled).toBe(i === steps.length - 1));
    }
  });

  it("keeps the graph and one strip in compact form", () => {
    for (const id of ["bfs", "dfs", "dijkstra", "topo", "bipartite"] as const) {
      const mini = MINIS[id];
      const steps = DEFS[id].steps(input(id, "small", mini.start), { world: mini, compact: true });
      for (const s of steps) {
        const m = s.model;
        expect(m.kind).toBe("composite");
        if (m.kind === "composite") expect(m.parts).toHaveLength(2);
      }
    }
  });

  it("never draws the same picture twice in a row", () => {
    for (const [id, preset] of cases) {
      const steps = DEFS[id].steps(input(id, preset));
      steps.forEach((s, i) => {
        if (i > 0) expect(JSON.stringify(s.model)).not.toBe(JSON.stringify(steps[i - 1]?.model));
      });
    }
  });

  it("has presets for every case", () => {
    expect(Object.keys(PRESETS)).toContain("dag-cycle");
  });
});
