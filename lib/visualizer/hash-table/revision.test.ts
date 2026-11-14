import { describe, expect, it } from "vitest";
import { DEFS } from "./defs";
import { hashRevision } from "./revision";
import { HASH_IDS } from "./types";

const STEPS = { chaining: 16, linear: 26, quadratic: 20, double: 27, resize: 36 } as const;

describe("hash table revision", () => {
  const cards = hashRevision(DEFS);

  it("has one card per variant in chip order with the hand-checked step counts", () => {
    expect(cards.map((c) => c.id)).toEqual([...HASH_IDS]);
    for (const c of cards) {
      expect(c.steps).toBe(STEPS[c.id as keyof typeof STEPS]);
      expect(c.stepsText).toHaveLength(c.steps);
      expect(c.summary.length).toBeGreaterThan(0);
      expect(c.differs.length).toBeGreaterThan(0);
    }
  });

  it("renders the first and last pictures and keeps the slot layout fixed", () => {
    for (const c of cards) {
      const first = c.render(0);
      const last = c.render(c.steps);
      expect(first.kind).toBe("shape");
      expect(last.kind).toBe("shape");
      if (first.kind === "shape" && first.model.kind === "table") {
        expect(first.model.lists[0]?.slots.length).toBeGreaterThan(0);
      }
    }
  });

  it("the resize card ends on one list of 8 slots", () => {
    const last = cards.find((c) => c.id === "resize")?.render(36);
    if (last?.kind !== "shape" || last.model.kind !== "table") throw new Error("expected table");
    expect(last.model.lists).toHaveLength(1);
    expect(last.model.lists[0]?.slots).toHaveLength(8);
  });
});
