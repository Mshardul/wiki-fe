import { describe, expect, it } from "vitest";
import type { InputValues } from "../core/fields";
import { graphModule } from "./module";
import { GRAPH_IDS } from "./types";

const FIXTURE: Record<string, string> = {
  bfs: "small",
  dfs: "small",
  dijkstra: "weighted",
  topo: "dag",
  bipartite: "ring-odd",
};
const CASES: [string, (algo: string) => InputValues][] = [
  ["its fixture", (algo) => ({ algo, preset: FIXTURE[algo] ?? "small", start: "A", seed: 0 })],
  ["a shuffled seed", (algo) => ({ algo, preset: FIXTURE[algo] ?? "small", start: "A", seed: 7 })],
  ["another seed", (algo) => ({ algo, preset: FIXTURE[algo] ?? "small", start: "A", seed: 4242 })],
  ["a start that reaches little", (algo) => ({ algo, preset: "dag", start: "E", seed: 0 })],
  ["the cyclic DAG", (algo) => ({ algo, preset: "dag-cycle", start: "A", seed: 0 })],
  ["the odd ring", (algo) => ({ algo, preset: "ring-odd", start: "C", seed: 0 })],
];

describe("graph steps", () => {
  for (const algo of GRAPH_IDS) {
    for (const [name, make] of CASES) {
      it(`${algo} on ${name}: no repeats, paths valid, settled at the end`, () => {
        const { frames } = graphModule.run(make(algo));
        expect(frames[0]?.badge).toBe("Start");
        expect(frames[frames.length - 1]?.badge).toBe("Done");
        frames.forEach((f, i) => {
          if (i > 0) expect(JSON.stringify(f.model)).not.toBe(JSON.stringify(frames[i - 1]?.model));
          expect(f.lines.length).toBeGreaterThanOrEqual(2);
          expect(f.lines.length).toBeLessThanOrEqual(4);
          for (const p of f.path) expect(p).toBeLessThan(f.lines.length);
        });
        const last = frames[frames.length - 1]?.model;
        if (last?.kind !== "composite") throw new Error("expected composite");
        expect(last.parts[0]?.kind === "graph" && last.parts[0].settled).toBe(true);
      });
    }

    it(`${algo}: the same seed gives the same frames`, () => {
      const make = CASES[1]?.[1] as (a: string) => InputValues;
      expect(JSON.stringify(graphModule.run(make(algo)).frames)).toBe(
        JSON.stringify(graphModule.run(make(algo)).frames),
      );
    });
  }
});
