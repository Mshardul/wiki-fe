import { describe, expect, it } from "vitest";
import {
  clampFrame,
  elapsedForSub,
  frameDuration,
  isFrameDone,
  SETTLE_MS,
  STEP_MS,
  subStepAt,
} from "./playback";

describe("playback math", () => {
  it("frame duration scales with speed", () => {
    expect(frameDuration(1)).toBe(STEP_MS);
    expect(frameDuration(2)).toBe(STEP_MS / 2);
    expect(frameDuration(0.5)).toBe(STEP_MS * 2);
  });

  it("sub-step splits the frame evenly and clamps", () => {
    expect(subStepAt(0, 3, 1)).toBe(0);
    expect(subStepAt(STEP_MS / 3 + 1, 3, 1)).toBe(1);
    expect(subStepAt(STEP_MS * 5, 3, 1)).toBe(2);
    expect(subStepAt(-50, 3, 1)).toBe(0);
    expect(subStepAt(9999, 1, 1)).toBe(0);
  });

  it("a frame is done after its duration plus the settle time", () => {
    expect(isFrameDone(STEP_MS + SETTLE_MS - 1, 1)).toBe(false);
    expect(isFrameDone(STEP_MS + SETTLE_MS, 1)).toBe(true);
  });

  it("clampFrame keeps the index inside the run", () => {
    expect(clampFrame(998, 12)).toBe(11);
    expect(clampFrame(-4, 12)).toBe(0);
    expect(clampFrame(3.7, 12)).toBe(3);
    expect(clampFrame(5, 0)).toBe(0);
  });

  it("elapsedForSub is the start time of that sub-step", () => {
    expect(elapsedForSub(2, 4, 1)).toBe(STEP_MS / 2);
    expect(elapsedForSub(0, 0, 1)).toBe(0);
  });
});
