import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SETTLE_MS, STEP_MS, TICK_MS } from "@/lib/visualizer/core/playback";
import type { VizFrame } from "@/lib/visualizer/core/types";
import { usePlayback } from "./usePlayback";

const frames = (n: number): VizFrame[] =>
  Array.from({ length: n }, (_, i) => ({
    index: i,
    label: "A",
    outcome: "bad",
    badge: "MISS",
    caption: [],
    lines: [[], [], [], []],
    path: [0, 2, 3],
    vars: [],
    logNote: [],
    metric: "0%",
    model: { kind: "ring", slots: [], hand: 0, turns: 0, cleared: [], active: null, tone: null },
  }));
const FRAME_MS = STEP_MS + SETTLE_MS + TICK_MS;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("usePlayback", () => {
  it("autoplays sub-steps, then moves to the next frame", () => {
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    expect(result.current.playing).toBe(true);
    act(() => {
      vi.advanceTimersByTime(STEP_MS / 3 + TICK_MS);
    });
    expect(result.current.sub).toBe(1);
    act(() => {
      vi.advanceTimersByTime(STEP_MS);
    });
    expect(result.current.frame).toBe(1);
  });

  it("a backgrounded tab advances exactly one frame per tick", () => {
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    act(() => {
      vi.setSystemTime(Date.now() + 60_000);
      vi.advanceTimersByTime(TICK_MS);
    });
    expect(result.current.frame).toBe(1);
  });

  it("stops at the last frame, and play restarts from the first", () => {
    const run = frames(2);
    const { result } = renderHook(() => usePlayback(run));
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 3);
    });
    expect(result.current.frame).toBe(1);
    expect(result.current.playing).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.frame).toBe(0);
    expect(result.current.playing).toBe(true);
  });

  it("repeat cycles off → once → infinite → off", () => {
    const { result } = renderHook(() => usePlayback(frames(2)));
    expect(result.current.repeat).toBe("off");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe("once");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe("infinite");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe("off");
  });

  it("repeat once plays the run one extra time, then stops", () => {
    const { result } = renderHook(() => usePlayback(frames(2)));
    act(() => result.current.cycleRepeat());
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 3);
    });
    expect(result.current.playing).toBe(true);
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 3);
    });
    expect(result.current.playing).toBe(false);
    expect(result.current.frame).toBe(1);
  });

  it("infinite repeat keeps playing past the end", () => {
    const { result } = renderHook(() => usePlayback(frames(2)));
    act(() => result.current.cycleRepeat());
    act(() => result.current.cycleRepeat());
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 9);
    });
    expect(result.current.playing).toBe(true);
  });

  it("a manual seek gives repeat once its extra pass back", () => {
    const { result } = renderHook(() => usePlayback(frames(2)));
    act(() => result.current.cycleRepeat());
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 3);
    });
    act(() => result.current.seek(0));
    act(() => {
      vi.advanceTimersByTime(FRAME_MS * 3);
    });
    expect(result.current.playing).toBe(true);
  });

  it("step pauses and shows the whole step", () => {
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    act(() => result.current.step(1));
    expect(result.current.playing).toBe(false);
    expect(result.current.frame).toBe(1);
    expect(result.current.sub).toBe(2);
    act(() => result.current.step(-5));
    expect(result.current.frame).toBe(0);
  });

  it("seek clamps and keeps playing", () => {
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    act(() => result.current.seek(99));
    expect(result.current.frame).toBe(4);
    expect(result.current.playing).toBe(true);
    expect(result.current.sub).toBe(0);
  });

  it("clamps the initial frame and a frame left past the end of a shorter run", () => {
    const long = frames(10);
    const short = frames(3);
    const { result, rerender } = renderHook(({ run }) => usePlayback(run, 99), {
      initialProps: { run: long },
    });
    expect(result.current.frame).toBe(9);
    rerender({ run: short });
    expect(result.current.frame).toBe(2);
  });

  it("does not autoplay when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    expect(result.current.playing).toBe(false);
  });

  it("restart jumps to the first frame and plays", () => {
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    act(() => result.current.step(3));
    act(() => result.current.restart());
    expect(result.current.frame).toBe(0);
    expect(result.current.playing).toBe(true);
  });

  it("restart under reduced motion resets without playing", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    const { result } = renderHook(() => usePlayback(frames(5)));
    act(() => result.current.seek(3));
    act(() => result.current.restart());
    expect(result.current.frame).toBe(0);
    expect(result.current.playing).toBe(false);
  });

  it("restart({ play: true }) plays even under reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    const { result } = renderHook(() => usePlayback(frames(5)));
    act(() => result.current.restart({ play: true }));
    expect(result.current.frame).toBe(0);
    expect(result.current.playing).toBe(true);
  });
});
