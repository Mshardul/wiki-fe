import { describe, expect, it } from "vitest";
import { allFields, type InputValues } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { graphModule } from "./module";
import { words } from "./test-helpers";
import { GRAPH_IDS } from "./types";

const base = (): InputValues => graphModule.defaults();

describe("graph module", () => {
  it("has the field keys and variant settings", () => {
    expect(allFields(graphModule.sections).map((f) => f.key)).toEqual([
      "algo",
      "preset",
      "start",
      "seed",
    ]);
    expect(graphModule.variants).toEqual({ key: "algo", restartOnSwitch: true });
    expect(graphModule.slug).toBe("graph-traversals");
  });

  it("starts with BFS on the small graph in declared order", () => {
    expect(base()).toEqual({ algo: "bfs", preset: "small", start: "A", seed: 0 });
    const { frames } = graphModule.run(base());
    expect(frames).toHaveLength(51);
    expect(frames[0]?.badge).toBe("Start");
    expect(frames[frames.length - 1]?.badge).toBe("Done");
  });

  it("runs every variant from Start to Done with vars on every frame", () => {
    for (const algo of GRAPH_IDS) {
      const { frames } = graphModule.run({ ...base(), algo });
      expect(frames[0]?.badge).toBe("Start");
      expect(frames[frames.length - 1]?.badge).toBe("Done");
      for (const f of frames) expect(f.vars.length).toBeGreaterThan(0);
    }
  });

  it("has the hand-checked first steps for BFS", () => {
    const { frames } = graphModule.run(base());
    expect(frames.slice(0, 8).map((f) => f.badge)).toEqual(
      words("Start Enqueue Dequeue Check Discover Check Discover Finish"),
    );
  });

  it("links each variant to its article", () => {
    const hrefs = Object.fromEntries(
      GRAPH_IDS.map((algo) => [algo, graphModule.run({ ...base(), algo }).info.articleHref]),
    );
    expect(hrefs).toEqual({
      bfs: "/dsa/algorithms/bfs/",
      dfs: "/dsa/algorithms/dfs/",
      dijkstra: "/dsa/algorithms/dijkstra/",
      topo: "/dsa/algorithms/topological-sort/",
      bipartite: "/dsa/patterns/graph-coloring/",
    });
  });

  it("disables the start node for topological sort and hints a fallback graph", () => {
    const topo = graphModule.availability?.({ ...base(), algo: "topo", preset: "ring-odd" }) ?? {};
    expect(topo.start?.disabled).toBe(true);
    expect(topo.preset?.hint).toBeTruthy();
    const dij = graphModule.availability?.({ ...base(), algo: "dijkstra" }) ?? {};
    expect(dij.preset?.hint).toBeTruthy();
    const bfs = graphModule.availability?.(base()) ?? {};
    expect(bfs.preset).toBeUndefined();
  });

  it("hints when the start node is not in the graph", () => {
    const a = graphModule.availability?.({ ...base(), preset: "ring-odd", start: "G" }) ?? {};
    expect(a.start?.hint).toContain("G");
  });

  it("round-trips through the URL", () => {
    const d: InputValues = { ...base(), algo: "dijkstra", preset: "weighted", start: "C", seed: 7 };
    const search = encodeState(graphModule.sections, d, { frame: 3, rotated: false });
    const back = parseState(search, graphModule.sections, base());
    expect(back.values).toMatchObject({
      algo: "dijkstra",
      preset: "weighted",
      start: "C",
      seed: 7,
    });
    expect(back.view.frame).toBe(3);
  });
});
