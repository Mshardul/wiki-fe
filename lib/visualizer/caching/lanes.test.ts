import { describe, expect, it } from "vitest";
import { sectionRows } from "../core/geometry";
import { cardRowsFor } from "./lanes";
import { cacheAside } from "./strategies/cache-aside";
import { at, lanes, run } from "./test-helpers";

describe("cardRowsFor", () => {
  it("reserves a title plus one row per key, and the buffer section when flushing", () => {
    expect(cardRowsFor(3, false)).toBe(4);
    expect(cardRowsFor(3, true)).toBe(4 + 1 + 1);
    expect(cardRowsFor(5, true)).toBe(6 + 1 + 2);
  });
});

describe("buildModel", () => {
  it("never needs more rows than it reserves", () => {
    const f = run(cacheAside, "RA RB RC XA WB");
    for (const frame of f) {
      const m = lanes(frame);
      for (const lane of m.lanes) {
        const rows = lane.sections.reduce((n, s) => n + sectionRows(s), 0);
        expect(rows).toBeLessThanOrEqual(m.cardRows);
      }
    }
  });

  it("lists App, Cache and DB in order with no card on the App lane", () => {
    const m = lanes(at(run(cacheAside, "RA"), 0));
    expect(m.lanes.map((l) => l.id)).toEqual(["app", "cache", "db"]);
    expect(m.lanes[0]?.sections).toEqual([]);
    expect(m.lanes.every((l) => !l.dead)).toBe(true);
  });
});
