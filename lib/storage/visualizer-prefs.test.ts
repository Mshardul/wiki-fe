import { beforeEach, describe, expect, it } from "vitest";
import { KEYS } from "./keys";
import {
  clearVisualizerOrder,
  getVisualizerOrder,
  getVisualizerPanels,
  setVisualizerOrder,
  setVisualizerPanels,
} from "./visualizer-prefs";

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

describe("visualizer order", () => {
  it("returns null when nothing is saved", () => {
    expect(getVisualizerOrder("eviction-policies")).toBeNull();
  });

  it("round-trips per slug without touching other visualizers", () => {
    setVisualizerOrder("a", ["x", "y"]);
    setVisualizerOrder("b", ["p"]);
    expect(getVisualizerOrder("a")).toEqual(["x", "y"]);
    expect(getVisualizerOrder("b")).toEqual(["p"]);
    clearVisualizerOrder("a");
    expect(getVisualizerOrder("a")).toBeNull();
    expect(getVisualizerOrder("b")).toEqual(["p"]);
  });

  it("ignores malformed stored values", () => {
    localStorage.setItem(KEYS.visualizerOrder, "not json");
    expect(getVisualizerOrder("a")).toBeNull();
    localStorage.setItem(KEYS.visualizerOrder, '{"a":"x","b":[1]}');
    expect(getVisualizerOrder("a")).toBeNull();
    expect(getVisualizerOrder("b")).toBeNull();
  });
});
