import { describe, expect, it } from "vitest";
import {
  defaultAxis,
  type LinearModel,
  modelKeys,
  type RankingModel,
  type RingModel,
  resolveAxis,
} from "./shapes";

const linear: LinearModel = {
  kind: "linear",
  items: ["F", "A"],
  capacity: 4,
  next: null,
  active: "F",
  tone: "new",
  evicted: null,
  labels: { entry: "newest", exit: "next out" },
  defaultAxis: "vertical",
};
const ring: RingModel = {
  kind: "ring",
  slots: [{ key: "A", bit: 1 }, null],
  hand: 0,
  turns: 0,
  cleared: [],
  active: 0,
  tone: "new",
};

const ranking: RankingModel = {
  kind: "ranking",
  rows: [
    { key: "A", count: 3 },
    { key: "D", count: 1 },
  ],
  capacity: 4,
  next: "D",
  active: "A",
  tone: "hit",
  evicted: null,
};

describe("shape models", () => {
  it("rotation swaps the default axis; rings have no axis", () => {
    expect(defaultAxis(linear)).toBe("vertical");
    expect(resolveAxis(linear, false)).toBe("vertical");
    expect(resolveAxis(linear, true)).toBe("horizontal");
    expect(resolveAxis({ ...linear, defaultAxis: "horizontal" }, true)).toBe("vertical");
    expect(resolveAxis(ring, true)).toBeNull();
  });

  it("a ranking is a list, so it has no axis to rotate", () => {
    expect(defaultAxis(ranking)).toBeNull();
    expect(resolveAxis(ranking, true)).toBeNull();
  });

  it("modelKeys lists the cached keys in shape order", () => {
    expect(modelKeys(linear)).toEqual(["F", "A"]);
    expect(modelKeys(ring)).toEqual(["A"]);
    expect(modelKeys(ranking)).toEqual(["A", "D"]);
    expect(
      modelKeys({
        kind: "histogram",
        slots: [null, { key: "B", count: 2 }],
        next: null,
        active: null,
        tone: null,
        defaultAxis: "vertical",
      }),
    ).toEqual(["B"]);
  });
});
