import { describe, expect, it } from "vitest";
import type { GraphModel } from "../core/shapes";
import { DEFS } from "./defs";
import { graphRevision } from "./revision";
import { GRAPH_IDS } from "./types";

describe("graph revision", () => {
  const cards = graphRevision(DEFS);

  it("has five cards in chip order", () => {
    expect(cards.map((c) => c.id)).toEqual([...GRAPH_IDS]);
  });

  it("each card loops with copy and a settled last picture", () => {
    for (const card of cards) {
      expect(card.stepsText).toHaveLength(card.steps);
      const first = card.render(0);
      const end = card.render(card.steps);
      if (first.kind !== "shape" || end.kind !== "shape") throw new Error("expected shapes");
      expect(end.model.kind === "composite" && (end.model.parts[0] as GraphModel).settled).toBe(
        true,
      );
      expect(card.summary.length).toBeGreaterThan(0);
      expect(card.differs.length).toBeGreaterThan(0);
    }
  });

  it("draws two parts and keeps node positions at every lit step", () => {
    for (const card of cards) {
      const positions = new Set<string>();
      for (let lit = 0; lit <= card.steps; lit++) {
        const v = card.render(lit);
        if (v.kind !== "shape" || v.model.kind !== "composite")
          throw new Error("expected composite");
        expect(v.model.parts).toHaveLength(2);
        const g = v.model.parts[0] as GraphModel;
        positions.add(JSON.stringify(g.nodes.map((n) => [n.id, n.x, n.y])));
      }
      expect(positions.size).toBe(1);
    }
  });

  it("ends the bipartite card on a flashing edge", () => {
    const end = cards[4]?.render(cards[4].steps);
    if (end?.kind !== "shape" || end.model.kind !== "composite")
      throw new Error("expected composite");
    const g = end.model.parts[0] as GraphModel;
    expect(g.edges.some((e) => e.state === "flash")).toBe(true);
  });
});
