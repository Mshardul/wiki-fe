import { describe, expect, it } from "vitest";
import { linearLayout } from "./geometry";

describe("linearLayout", () => {
  it("vertical: centred column, slots stacked top to bottom", () => {
    const L = linearLayout({ w: 800, h: 600 }, 4, "vertical");
    expect(L.slot(0).x).toBeCloseTo((800 - L.block.w) / 2);
    expect(L.slot(1).y - L.slot(0).y).toBeCloseTo(L.block.h + 8);
    expect(L.exit.y).toBeGreaterThan(600);
    expect(L.block.w).toBeLessThanOrEqual(150);
  });

  it("horizontal: centred row, slots left to right", () => {
    const L = linearLayout({ w: 800, h: 400 }, 4, "horizontal");
    const first = L.slot(0).x - 6;
    const last = L.slot(3).x - 6 + L.block.w + 12;
    expect(first).toBeCloseTo(800 - last);
    expect(L.slot(1).x).toBeGreaterThan(L.slot(0).x);
    expect(L.exit.x).toBeGreaterThan(800);
  });

  it("keeps blocks usable on a 320px stage with 8 slots", () => {
    const L = linearLayout({ w: 320, h: 360 }, 8, "horizontal");
    expect(L.block.w).toBeGreaterThanOrEqual(18);
    const V = linearLayout({ w: 320, h: 300 }, 8, "vertical");
    expect(V.block.h).toBeGreaterThanOrEqual(28);
  });
});
