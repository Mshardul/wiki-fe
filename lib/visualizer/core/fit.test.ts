import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIT_SCALE_MAX, fitScale } from "./fit";

describe("fitScale", () => {
  const natural = { width: 200, height: 100 };

  it("is limited by the stage height on a wide stage", () => {
    expect(fitScale(natural, { width: 1000, height: 150 })).toBe(1.5);
  });

  it("is limited by the stage width on a tall stage", () => {
    expect(fitScale(natural, { width: 100, height: 1000 })).toBe(0.5);
  });

  it("is capped at the maximum", () => {
    expect(fitScale(natural, { width: 5000, height: 5000 })).toBe(FIT_SCALE_MAX);
    expect(fitScale(natural, { width: 5000, height: 5000 }, 3)).toBe(3);
  });

  it("uses one scale for both axes so the aspect ratio is kept", () => {
    const s = fitScale(natural, { width: 300, height: 120 });
    expect(natural.width * s).toBeLessThanOrEqual(300);
    expect(natural.height * s).toBeLessThanOrEqual(120);
  });

  it("returns 1 while the stage or the drawing is not measured yet", () => {
    expect(fitScale(natural, { width: 0, height: 0 })).toBe(1);
    expect(fitScale({ width: 0, height: 0 }, { width: 300, height: 300 })).toBe(1);
  });

  it("keeps the cap equal to the css token", () => {
    const css = readFileSync("css/tokens.css", "utf8");
    expect(css).toContain(`--viz-fit-scale-max: ${FIT_SCALE_MAX};`);
  });
});
