import { describe, expect, it } from "vitest";
import { DEFS } from "./defs";
import { sortingRevision } from "./revision";
import { SORT_IDS } from "./types";

describe("sorting revision", () => {
  const cards = sortingRevision(DEFS);

  it("has eight cards in chip order", () => {
    expect(cards.map((c) => c.id)).toEqual([...SORT_IDS]);
  });

  it("each card loops from unsorted to sorted", () => {
    for (const card of cards) {
      expect(card.stepsText).toHaveLength(card.steps);
      const first = card.render(0);
      const end = card.render(card.steps);
      if (first.kind !== "shape" || end.kind !== "shape") throw new Error("expected shapes");
      const read = (m: typeof first.model, label?: string) => {
        const arr = m.kind === "heap" ? m.array : m;
        if (arr?.kind !== "array") throw new Error("expected array");
        const row = arr.rows.find((r) => r.label === label) ?? arr.rows[0];
        return (row?.bars ?? []).flatMap((b) => (b ? [b.value] : []));
      };
      const a = read(first.model);
      const b = read(end.model, "output");
      expect(a).not.toEqual([...a].sort((x, y) => x - y));
      expect(b).toEqual([...b].sort((x, y) => x - y));
      expect(card.summary.length).toBeGreaterThan(0);
      expect(card.differs.length).toBeGreaterThan(0);
    }
  });
});
