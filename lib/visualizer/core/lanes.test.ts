import { describe, expect, it } from "vitest";
import { CHIPS_PER_ROW, lanesLayout, sectionRows } from "./geometry";
import { defaultAxis, type LanesModel, modelKeys, resolveAxis } from "./shapes";

const model: LanesModel = {
  kind: "lanes",
  lanes: [{ id: "app", name: "App", sections: [] }],
  hops: [],
  slots: 1,
  cardRows: 0,
};

describe("lanes model", () => {
  it("has no axis and no keys", () => {
    expect(defaultAxis(model)).toBeNull();
    expect(resolveAxis(model, true)).toBeNull();
    expect(modelKeys(model)).toEqual([]);
  });
});

describe("sectionRows", () => {
  it("counts a title row plus one row per item for rows", () => {
    const items = [{ text: "A" }, { text: "B" }, { text: "C" }];
    expect(sectionRows({ title: "Entries", layout: "rows", items })).toBe(4);
  });

  it("packs chips into rows of CHIPS_PER_ROW", () => {
    const items = Array.from({ length: CHIPS_PER_ROW + 1 }, (_, i) => ({ text: String(i) }));
    expect(sectionRows({ title: "Buffer", layout: "chips", items })).toBe(3);
    expect(sectionRows({ title: "Buffer", layout: "chips", items: [] })).toBe(1);
  });
});

describe("lanesLayout", () => {
  it("spaces lanes evenly across the width", () => {
    const l = lanesLayout(3, 4, 6);
    expect([0, 1, 2].map((i) => Math.round(l.laneX(i)))).toEqual([107, 320, 533]);
    expect(l.width).toBe(640);
  });

  it("reserves card height from cardRows and places hops below the card", () => {
    const l = lanesLayout(3, 4, 6);
    expect(l.cardW).toBe(190);
    expect(l.cardH).toBe(106);
    expect(l.lifeTop).toBe(162);
    expect(l.hopY(0)).toBe(192);
    expect(l.hopY(1)).toBe(228);
    expect(l.lifeBottom).toBe(336);
    expect(l.height).toBe(366);
  });

  it("collapses the card area when no card rows are reserved", () => {
    const l = lanesLayout(3, 4, 0);
    expect(l.cardH).toBe(0);
    expect(l.lifeTop).toBe(56);
    expect(l.hopY(0)).toBe(86);
  });

  it("grows with the number of hop slots and never goes below one", () => {
    expect(lanesLayout(3, 7, 6).height).toBeGreaterThan(lanesLayout(3, 2, 6).height);
    expect(lanesLayout(3, 0, 6).height).toBe(lanesLayout(3, 1, 6).height);
  });

  it("caps the card width on narrow lane counts", () => {
    expect(lanesLayout(2, 1, 1).cardW).toBe(190);
    expect(lanesLayout(4, 1, 1).cardW).toBe(140);
  });
});
