import { describe, expect, it } from "vitest";
import { effectivePreset, toGraphInput } from "./input";

describe("effectivePreset", () => {
  it("sends Dijkstra to the weighted graph and topological sort to a DAG", () => {
    expect(effectivePreset("dijkstra", "small")).toBe("weighted");
    expect(effectivePreset("topo", "ring-odd")).toBe("dag");
    expect(effectivePreset("topo", "dag-cycle")).toBe("dag-cycle");
  });

  it("lets the other variants run on any graph", () => {
    expect(effectivePreset("bfs", "ring-odd")).toBe("ring-odd");
    expect(effectivePreset("bipartite", "dag")).toBe("dag");
  });
});

describe("toGraphInput", () => {
  it("falls back on junk fields", () => {
    expect(toGraphInput({ algo: "x", preset: "y", start: 3, seed: "z" })).toEqual({
      algo: "bfs",
      preset: "small",
      start: "A",
      seed: 0,
    });
  });

  it("falls back to the first node when the start is not in the graph", () => {
    expect(toGraphInput({ algo: "bfs", preset: "ring-odd", start: "G" }).start).toBe("A");
    expect(toGraphInput({ algo: "bfs", preset: "small", start: "G" }).start).toBe("G");
  });

  it("clamps the seed into range", () => {
    expect(toGraphInput({ seed: -5 }).seed).toBe(0);
    expect(toGraphInput({ seed: 10 ** 9 }).seed).toBe(0xffff);
  });
});
