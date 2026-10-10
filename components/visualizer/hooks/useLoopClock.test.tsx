import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOOP } from "@/lib/visualizer/core/loop";
import { useLoopClock } from "./useLoopClock";

const reduced = (on: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi
      .fn()
      .mockReturnValue({ matches: on, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );

beforeEach(() => {
  vi.useFakeTimers();
  reduced(false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useLoopClock", () => {
  it("starts running at the first step and advances every step interval", () => {
    const { result } = renderHook(() => useLoopClock(3));
    expect(result.current).toMatchObject({ lit: 1, phase: "play", running: true });
    act(() => {
      vi.advanceTimersByTime(LOOP.stepMs);
    });
    expect(result.current.lit).toBe(2);
  });

  it("holds the finished state, resets, then loops again", () => {
    const { result } = renderHook(() => useLoopClock(2));
    act(() => {
      vi.advanceTimersByTime(2 * LOOP.stepMs);
    });
    expect(result.current).toMatchObject({ phase: "hold", lit: 2 });
    act(() => {
      vi.advanceTimersByTime(LOOP.holdMs);
    });
    expect(result.current).toMatchObject({ phase: "reset", lit: 0 });
    act(() => {
      vi.advanceTimersByTime(LOOP.resetMs);
    });
    expect(result.current).toMatchObject({ phase: "play", lit: 1 });
  });

  it("toggle pauses in place and resumes from the same spot", () => {
    const { result } = renderHook(() => useLoopClock(3));
    act(() => {
      vi.advanceTimersByTime(LOOP.stepMs);
    });
    expect(result.current.lit).toBe(2);
    act(() => {
      result.current.toggle();
    });
    expect(result.current.running).toBe(false);
    act(() => {
      vi.advanceTimersByTime(10 * LOOP.stepMs);
    });
    expect(result.current.lit).toBe(2);
    act(() => {
      result.current.toggle();
    });
    act(() => {
      vi.advanceTimersByTime(LOOP.stepMs);
    });
    expect(result.current.lit).toBe(3);
  });

  it("under reduced motion shows the finished state, never runs and says so", () => {
    reduced(true);
    const { result } = renderHook(() => useLoopClock(4));
    expect(result.current).toMatchObject({ lit: 4, phase: "hold", running: false, reduced: true });
    act(() => {
      vi.advanceTimersByTime(10 * LOOP.stepMs);
    });
    expect(result.current.lit).toBe(4);
  });
});
