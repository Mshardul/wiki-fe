import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetToasts, type ActiveToast, showToast, subscribeToast } from "./toast";

describe("toast queue", () => {
  beforeEach(() => {
    _resetToasts();
    vi.useFakeTimers();
  });

  it("shows toasts FIFO, one at a time", () => {
    const seen: string[] = [];
    subscribeToast((t) => {
      if (t) seen.push(t.message);
    });
    showToast("first", { durationMs: 1000 });
    showToast("second", { durationMs: 1000 });
    showToast("third", { durationMs: 1000 });

    expect(seen).toEqual(["first"]);
    vi.advanceTimersByTime(1200);
    expect(seen).toEqual(["first", "second"]);
    vi.advanceTimersByTime(1200);
    expect(seen).toEqual(["first", "second", "third"]);
  });

  it("dedupes an identical message already queued", () => {
    const seen: string[] = [];
    subscribeToast((t) => {
      if (t) seen.push(t.message);
    });
    showToast("a", { durationMs: 1000 });
    showToast("b", { durationMs: 1000 });
    showToast("b", { durationMs: 1000 });

    vi.advanceTimersByTime(5000);
    expect(seen).toEqual(["a", "b"]);
  });

  it("higher priority jumps ahead of queued lower-priority toasts", () => {
    const seen: string[] = [];
    subscribeToast((t) => {
      if (t) seen.push(t.message);
    });
    showToast("low1", { durationMs: 1000 });
    showToast("low2", { durationMs: 1000, priority: 0 });
    showToast("urgent", { durationMs: 1000, priority: 5 });

    vi.advanceTimersByTime(5000);
    expect(seen).toEqual(["low1", "urgent", "low2"]);
  });

  it("carries variant and undo action through", () => {
    const undo = vi.fn();
    const box: { current: ActiveToast | null } = { current: null };
    subscribeToast((t) => {
      box.current = t;
    });
    showToast("removed", { durationMs: 1000, variant: "error", onUndo: undo });
    expect(box.current?.variant).toBe("error");
    box.current?.onUndo?.();
    expect(undo).toHaveBeenCalledOnce();
  });
});
