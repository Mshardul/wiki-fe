import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FieldSection } from "@/lib/visualizer/core/fields";
import { useUrlSync } from "./useUrlSync";

const SECTIONS: FieldSection[] = [
  {
    title: "",
    fields: [{ kind: "slider", key: "capacity", label: "Cache size", param: "c", min: 2, max: 8 }],
  },
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useUrlSync", () => {
  it("writes the encoded state after the debounce, replacing history", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    const values = { capacity: 4 };
    const { rerender } = renderHook(({ frame }) => useUrlSync(SECTIONS, values, frame, true), {
      initialProps: { frame: 0 },
    });
    rerender({ frame: 2 });
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[2]).toBe(`${window.location.pathname}?c=4&i=3&rot=1`);
  });

  it("writes view=revision when the revision view is active", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    renderHook(() => useUrlSync(SECTIONS, { capacity: 4 }, 0, false, "revision"));
    vi.advanceTimersByTime(300);
    expect(String(spy.mock.calls[0]?.[2])).toContain("view=revision");
  });
});
