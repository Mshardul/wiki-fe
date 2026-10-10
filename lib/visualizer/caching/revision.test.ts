import { describe, expect, it } from "vitest";
import { cachingModule } from "./module";
import { cachingRevision } from "./revision";
import { STRATEGY_IDS } from "./types";

describe("cachingRevision", () => {
  const cards = cachingRevision();

  it("has one flow card per strategy, in the module's option order", () => {
    expect(cards.map((c) => c.id)).toEqual([...STRATEGY_IDS]);
    expect(cachingModule.revision?.map((c) => c.id)).toEqual([...STRATEGY_IDS]);
    for (const card of cards) expect(card.render(0).kind).toBe("flow");
  });

  it("steps are numbered 1..n with no gaps and match the screen-reader list", () => {
    for (const card of cards) {
      const visual = card.render(card.steps);
      if (visual.kind !== "flow") throw new Error("expected a flow");
      expect(visual.flow.edges.map((e) => e.step)).toEqual(visual.flow.edges.map((_, i) => i + 1));
      expect(card.steps).toBe(visual.flow.edges.length);
      expect(card.stepsText).toHaveLength(card.steps);
      expect(visual.flow.lit).toBe(card.steps);
    }
  });

  it("every edge names a real node", () => {
    for (const card of cards) {
      const visual = card.render(1);
      if (visual.kind !== "flow") throw new Error("expected a flow");
      const ids = visual.flow.nodes.map((n) => n.id);
      for (const e of visual.flow.edges) {
        expect(ids).toContain(e.from);
        expect(ids).toContain(e.to);
      }
    }
  });

  it("render clamps lit to the card's own range", () => {
    const card = cards[0];
    const flow = (lit: number) => {
      const v = card?.render(lit);
      return v?.kind === "flow" ? v.flow.lit : -1;
    };
    expect(flow(-2)).toBe(0);
    expect(flow(99)).toBe(card?.steps);
  });

  it("the defining line style appears where the strategy depends on it", () => {
    const styles = (id: string) => {
      const v = cards.find((c) => c.id === id)?.render(99);
      return v?.kind === "flow" ? v.flow.edges.map((e) => e.style) : [];
    };
    expect(styles("write-behind")).toContain("dashed");
    expect(styles("refresh-ahead")).toContain("dashed");
    expect(styles("read-through")).toContain("dotted");
    expect(styles("write-through")).not.toContain("dashed");
  });

  it("every card carries popup copy", () => {
    for (const card of cards) {
      expect(card.summary.length).toBeGreaterThan(20);
      expect(card.differs.length).toBeGreaterThan(20);
    }
  });
});
