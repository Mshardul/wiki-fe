import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALGORITHM_META } from "./copy";
import { rateLimitingRevision } from "./revision";
import { ALGORITHM_IDS } from "./types";

describe("rate-limiting revision", () => {
  const cards = rateLimitingRevision();

  it("has one card per algorithm in variant order", () => {
    expect(cards.map((c) => c.id)).toEqual([...ALGORITHM_IDS]);
    expect(cards.map((c) => c.name)).toEqual(ALGORITHM_IDS.map((id) => ALGORITHM_META[id].name));
  });

  it("each card plays the eight steps of the mini stream and describes them for screen readers", () => {
    for (const c of cards) {
      expect(c.steps, c.id).toBe(8);
      expect(c.stepsText, c.id).toHaveLength(8);
      expect(c.stepsText[0], c.id).toMatch(/^Request t4: /);
    }
  });

  it("render(0) is the empty start state and render(8) is the finished state", () => {
    for (const c of cards) {
      const first = c.render(0);
      const last = c.render(8);
      expect(first.kind, c.id).toBe("shape");
      expect(last.kind, c.id).toBe("shape");
      if (first.kind === "shape")
        expect(JSON.stringify(first.model)).not.toContain('"current":true');
      if (last.kind === "shape") expect(JSON.stringify(last.model)).toContain('"current":true');
    }
  });

  it("the leaky bucket card drops the queue part to fit a 200px card", () => {
    const card = cards.find((c) => c.id === "leaky-bucket");
    const visual = card?.render(4);
    expect(
      visual?.kind === "shape" && visual.model.kind === "composite" && visual.model.parts,
    ).toHaveLength(1);
  });

  it("every card names a term that exists in the glossary", () => {
    const glossary = JSON.parse(
      readFileSync(join(process.cwd(), "data/glossary.json"), "utf8"),
    ) as Record<string, string>;
    for (const c of cards) {
      expect(c.glossaryTerm, c.id).toBeTruthy();
      expect(glossary[c.glossaryTerm ?? ""], c.id).toBeTruthy();
    }
  });

  it("summary and differs come from the copy", () => {
    for (const c of cards) {
      expect(c.summary).toBe(ALGORITHM_META[c.id as (typeof ALGORITHM_IDS)[number]].summary);
      expect(c.differs).toBe(ALGORITHM_META[c.id as (typeof ALGORITHM_IDS)[number]].differs);
    }
  });
});
