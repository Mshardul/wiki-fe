import { describe, expect, it } from "vitest";
import { PRESETS } from "./graphs";
import { placeLayered, placeNodeLink } from "./layout";

describe("placeLayered", () => {
  const placed = placeLayered([
    { nodes: ["A"] },
    { nodes: ["B", "C"] },
    { nodes: ["D", "E", "F"] },
    { nodes: ["G"] },
    { nodes: ["H"] },
  ]);

  it("puts one row per level", () => {
    expect([
      placed.pos.A?.y,
      placed.pos.C?.y,
      placed.pos.F?.y,
      placed.pos.G?.y,
      placed.pos.H?.y,
    ]).toEqual([0, 1, 2, 3, 4]);
    expect(placed.height).toBe(4);
    expect(placed.rows).toHaveLength(5);
  });

  it("spreads the widest row and centres the others", () => {
    expect([placed.pos.D?.x, placed.pos.E?.x, placed.pos.F?.x]).toEqual([0, 1, 2]);
    expect(placed.pos.A?.x).toBe(1);
    expect([placed.pos.B?.x, placed.pos.C?.x]).toEqual([0.5, 1.5]);
  });

  it("keeps a row label and never puts two nodes of a row at one x", () => {
    const p = placeLayered([{ nodes: ["A", "B"], label: "not reached" }]);
    expect(p.rows[0]?.label).toBe("not reached");
    expect(p.pos.A?.x).not.toBe(p.pos.B?.x);
  });

  it("is the same on every call", () => {
    expect(placeLayered([{ nodes: ["A"] }])).toEqual(placeLayered([{ nodes: ["A"] }]));
  });
});

describe("placeNodeLink", () => {
  it("returns the given coordinates and no rows", () => {
    const p = placeNodeLink(PRESETS.small.coords);
    expect(p.pos).toEqual(PRESETS.small.coords);
    expect(p.rows).toEqual([]);
    expect(p.cols).toBe(4.7);
    expect(p.height).toBe(3.3);
  });
});
