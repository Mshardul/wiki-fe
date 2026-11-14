import { describe, expect, it } from "vitest";
import { badges, counterOf, items, last, resultOf } from "../test-helpers";
import { selectionSteps } from "./selection";

describe("selection steps", () => {
  const steps = selectionSteps(items([3, 1, 2]));

  it("scans, remembers the smallest, then swaps", () => {
    expect(badges(steps)).toEqual([
      "Start",
      "Compare",
      "New min",
      "Compare",
      "Swap",
      "Compare",
      "New min",
      "Swap",
      "Done",
    ]);
  });

  it("ends sorted with the right counters", () => {
    expect(resultOf(last(steps))).toEqual(["1", "2", "3"]);
    expect(counterOf(last(steps), "comparisons")).toBe("3");
    expect(counterOf(last(steps), "swaps")).toBe("2");
  });

  it("shows pointers i, j and min", () => {
    expect(steps[1]?.array.rows[0]?.pointers.map((p) => p.label)).toEqual(["i", "j", "min"]);
  });

  it("is not stable: a long swap reorders equal items", () => {
    const out = selectionSteps(items([2, 2, 1], true));
    expect(resultOf(last(out))).toEqual(["1", "2b", "2a"]);
  });
});
