import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getVisualizerPanels, setVisualizerPanels } from "@/lib/storage/visualizer-prefs";
import { usePanelPrefs } from "./usePanelPrefs";

const setWidth = (w: number) =>
  Object.defineProperty(window, "innerWidth", { configurable: true, value: w });

beforeEach(() => localStorage.clear());
afterEach(() => setWidth(1024));

describe("usePanelPrefs", () => {
  it("starts with the right panel collapsed on narrow screens", () => {
    setWidth(1100);
    const { result } = renderHook(() => usePanelPrefs());
    expect(result.current).toMatchObject({ left: false, right: true });
  });

  it("starts expanded on wide screens", () => {
    setWidth(1440);
    const { result } = renderHook(() => usePanelPrefs());
    expect(result.current).toMatchObject({ left: false, right: false });
  });

  it("restores and persists the viewer's choice", () => {
    setVisualizerPanels({ left: true, right: false });
    const { result } = renderHook(() => usePanelPrefs());
    expect(result.current.left).toBe(true);
    act(() => result.current.toggle("left"));
    expect(result.current.left).toBe(false);
    expect(getVisualizerPanels()).toEqual({ left: false, right: false });
  });
});
