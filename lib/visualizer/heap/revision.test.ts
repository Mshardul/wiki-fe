import { describe, expect, it } from "vitest";
import { DEFS } from "./defs";
import { heapRevision } from "./revision";
import { HEAP_IDS } from "./types";

describe("heap revision", () => {
  const cards = heapRevision(DEFS);

  it("has five cards in chip order", () => {
    expect(cards.map((c) => c.id)).toEqual([...HEAP_IDS]);
  });

  it("each card loops and has copy", () => {
    for (const card of cards) {
      expect(card.stepsText).toHaveLength(card.steps);
      expect(card.render(0).kind).toBe("shape");
      expect(card.render(card.steps).kind).toBe("shape");
      expect(card.summary.length).toBeGreaterThan(0);
      expect(card.differs.length).toBeGreaterThan(0);
    }
  });
});
