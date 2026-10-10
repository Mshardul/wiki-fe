import { describe, expect, it } from "vitest";
import { modelKeys } from "../core/shapes";
import { evictionModule, POLICIES } from "./module";
import { evictionRevision, MINI_CAPACITY, MINI_TRACE } from "./revision";
import { POLICY_IDS } from "./types";

describe("evictionRevision", () => {
  const cards = evictionRevision(POLICIES);

  it("has one card per policy, in the module's default order", () => {
    expect(cards.map((c) => c.id)).toEqual([...POLICY_IDS]);
    expect(cards.map((c) => c.name)).toEqual(["FIFO", "LRU", "LFU", "CLOCK"]);
    expect(evictionModule.revision?.map((c) => c.id)).toEqual([...POLICY_IDS]);
  });

  it("plays the fixed mini-trace: five steps of shape models", () => {
    expect(MINI_TRACE.join("")).toBe("ABCAD");
    expect(MINI_CAPACITY).toBe(3);
    for (const card of cards) {
      expect(card.steps).toBe(5);
      expect(card.stepsText).toHaveLength(5);
      for (let lit = 0; lit <= card.steps; lit++) {
        expect(card.render(lit).kind).toBe("shape");
      }
    }
  });

  it("the policies visibly evict different keys on the last request", () => {
    const removed = Object.fromEntries(
      POLICY_IDS.map((id) => [
        id,
        POLICIES[id].run(MINI_CAPACITY, MINI_TRACE)[4]?.vars.find((v) => v.name === "removed")
          ?.value,
      ]),
    );
    expect(removed).toEqual({ fifo: "A", lru: "B", lfu: "B", clock: "A" });
  });

  it("render clamps lit to the card's own range", () => {
    const card = cards[0];
    expect(card?.render(-3)).toEqual(card?.render(0));
    expect(card?.render(99)).toEqual(card?.render(5));
  });

  it("lit 0 is an empty cache and lit 1 already holds the first request", () => {
    for (const card of cards) {
      const reset = card.render(0);
      const first = card.render(1);
      if (reset.kind !== "shape" || first.kind !== "shape") throw new Error("expected shapes");
      expect(modelKeys(reset.model)).toEqual([]);
      expect(modelKeys(first.model)).toEqual(["A"]);
    }
  });

  it("every card carries popup copy; only LRU has a glossary term", () => {
    for (const card of cards) {
      expect(card.summary.length).toBeGreaterThan(20);
      expect(card.differs.length).toBeGreaterThan(20);
    }
    expect(cards.filter((c) => c.glossaryTerm).map((c) => c.id)).toEqual(["lru"]);
    expect(cards.find((c) => c.id === "lru")?.glossaryTerm).toBe("lru");
  });
});
