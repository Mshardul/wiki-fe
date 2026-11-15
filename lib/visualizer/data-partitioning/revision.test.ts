import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { richText } from "../core/rich";
import { partitionFrames } from "./frames";
import { toKeyItems } from "./keys";
import { partitionRevision } from "./revision";
import { SCHEME_IDS } from "./types";

const glossary = JSON.parse(readFileSync("data/glossary.json", "utf8")) as Record<string, string>;
// The mini run: keys 12 18 29 61 65 66 hash to 55 77 84 68 16 53; three nodes, then one Add.
const MOVED = { "mod-n": 5, range: 2, ring: 2, directory: 1, rendezvous: 1 } as const;

describe("partition revision", () => {
  const cards = partitionRevision();

  it("has five cards in chip order, each 13 steps with one line of text per step", () => {
    expect(cards.map((c) => c.id)).toEqual([...SCHEME_IDS]);
    for (const c of cards) {
      expect(c.steps).toBe(13);
      expect(c.stepsText).toHaveLength(13);
      expect(new Set(c.stepsText).size).toBe(13);
      expect(c.summary.length).toBeGreaterThan(0);
      expect(c.differs.length).toBeGreaterThan(0);
    }
  });

  it("every card's last step reports the hand-derived moved count out of 6", () => {
    for (const id of SCHEME_IDS) {
      const frames = partitionFrames({
        scheme: id,
        start: 3,
        vnodes: 1,
        keys: toKeyItems(["12", "18", "29", "61", "65", "66"]),
        events: ["+"],
      });
      expect(frames.at(-1)?.metric, id).toBe(`${MOVED[id]}/6`);
    }
  });

  it("the finished state is held: asking past the last step draws the last picture", () => {
    for (const c of cards) {
      expect(JSON.stringify(c.render(c.steps + 5))).toBe(JSON.stringify(c.render(c.steps)));
    }
  });

  it("draws a shape at every step", () => {
    for (const c of cards) {
      for (let i = 0; i <= c.steps; i++) expect(c.render(i).kind).toBe("shape");
    }
  });

  it("Mod-N and the ring draw different shapes: bins against a circle", () => {
    const kinds = cards.map((c) => {
      const v = c.render(c.steps);
      return v.kind === "shape" ? v.model.kind : null;
    });
    expect(kinds).toEqual(["bins", "runs", "circle", "table", "table"]);
  });

  it("names the key and what happened in each step's text", () => {
    const modn = cards[0];
    expect(modn?.stepsText[0]).toBe("Place 12. h(12) = 55 → 55 mod 3 = 1 → B");
    expect(modn?.stepsText[12]).toBe("Moves 66. h(66) = 53 → 53 mod 4 = 1 → B · was C");
  });

  it("every glossary term exists", () => {
    for (const c of cards) {
      expect(c.glossaryTerm, c.id).toBeDefined();
      expect(glossary[c.glossaryTerm as string], c.glossaryTerm).toBeTruthy();
    }
  });

  it("step text carries no markup", () => {
    for (const c of cards) for (const t of c.stepsText) expect(t).not.toMatch(/[<>]/);
    expect(richText(["a", { text: "b", tone: "key" }])).toBe("ab");
  });
});
