import { describe, expect, it } from "vitest";
import { LOOP, loopState } from "./loop";

describe("loopState", () => {
  const steps = 3;
  const play = steps * LOOP.stepMs;

  it("lights one more step every stepMs", () => {
    expect(loopState(0, steps)).toEqual({ phase: "play", lit: 1 });
    expect(loopState(LOOP.stepMs - 1, steps)).toEqual({ phase: "play", lit: 1 });
    expect(loopState(LOOP.stepMs, steps)).toEqual({ phase: "play", lit: 2 });
    expect(loopState(play - 1, steps)).toEqual({ phase: "play", lit: 3 });
  });

  it("holds the finished state, then resets, then restarts", () => {
    expect(loopState(play, steps)).toEqual({ phase: "hold", lit: 3 });
    expect(loopState(play + LOOP.holdMs - 1, steps)).toEqual({ phase: "hold", lit: 3 });
    expect(loopState(play + LOOP.holdMs, steps)).toEqual({ phase: "reset", lit: 0 });
    const cycle = play + LOOP.holdMs + LOOP.resetMs;
    expect(loopState(cycle, steps)).toEqual({ phase: "play", lit: 1 });
    expect(loopState(cycle * 4 + LOOP.stepMs, steps)).toEqual({ phase: "play", lit: 2 });
  });

  it("treats a bad step count as one step and a negative time as the start", () => {
    expect(loopState(0, 0)).toEqual({ phase: "play", lit: 1 });
    expect(loopState(-5, steps)).toEqual({ phase: "play", lit: 1 });
  });
});
