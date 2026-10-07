import { beforeEach, describe, expect, it } from "vitest";
import { KEYS } from "./keys";
import { getVisualizerPanels, setVisualizerPanels } from "./visualizer-prefs";

beforeEach(() => localStorage.clear());

describe("visualizer-prefs", () => {
  it("returns null when nothing is stored", () => {
    expect(getVisualizerPanels()).toBeNull();
  });

  it("round-trips panel state", () => {
    setVisualizerPanels({ left: true, right: false });
    expect(getVisualizerPanels()).toEqual({ left: true, right: false });
    expect(localStorage.getItem(KEYS.visualizerPanels)).toBe('{"left":true,"right":false}');
  });

  it("ignores malformed stored values", () => {
    localStorage.setItem(KEYS.visualizerPanels, '{"left":"yes"}');
    expect(getVisualizerPanels()).toBeNull();
    localStorage.setItem(KEYS.visualizerPanels, "not json");
    expect(getVisualizerPanels()).toBeNull();
  });
});
