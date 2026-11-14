import { describe, expect, it } from "vitest";
import { hopRows, longestRows } from "./layers";
import { dag, dagCycle, graphOf, small } from "./test-helpers";

describe("hopRows", () => {
  it("groups the small graph by hops from A", () => {
    expect(hopRows(small, "A")).toEqual([
      { nodes: ["A"] },
      { nodes: ["B", "C"] },
      { nodes: ["D", "E", "F"] },
      { nodes: ["G"] },
      { nodes: ["H"] },
    ]);
  });

  it("puts nodes it cannot reach in a last labelled row", () => {
    expect(hopRows(dag, "C")).toEqual([
      { nodes: ["C"] },
      { nodes: ["E"] },
      { nodes: ["F"] },
      { nodes: ["A", "B", "D"], label: "not reached" },
    ]);
  });

  it("is one row for a single node and stable across calls", () => {
    const one = graphOf("A", []);
    expect(hopRows(one, "A")).toEqual([{ nodes: ["A"] }]);
    expect(hopRows(small, "A")).toEqual(hopRows(small, "A"));
  });
});

describe("longestRows", () => {
  it("groups the DAG by longest path from the sources", () => {
    expect(longestRows(dag)).toEqual([
      { nodes: ["A", "B"] },
      { nodes: ["C", "D"] },
      { nodes: ["E"] },
      { nodes: ["F"] },
    ]);
  });

  it("puts nodes a cycle holds back in a last labelled row", () => {
    expect(longestRows(dagCycle)).toEqual([
      { nodes: ["A", "B"] },
      { nodes: ["D"] },
      { nodes: ["C", "E", "F"], label: "stuck" },
    ]);
  });
});
