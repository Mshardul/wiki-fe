import { describe, expect, it } from "vitest";
import { badges, counterOf, items, last, resultOf } from "../test-helpers";
import { heapSteps } from "./heap";

describe("heap sort steps", () => {
  it("sorts [2,1,3]", () => {
    const steps = heapSteps(items([2, 1, 3]));
    expect(badges(steps)).toEqual([
      "Start",
      "Pick child",
      "Compare",
      "Swap",
      "Heap built",
      "Swap root",
      "Compare",
      "In place",
      "Swap root",
      "Done",
    ]);
    expect(resultOf(last(steps))).toEqual(["1", "2", "3"]);
    expect(counterOf(last(steps), "comparisons")).toBe("3");
    expect(counterOf(last(steps), "swaps")).toBe("3");
  });

  it("draws the tree as the picture, full at the start and empty at the end", () => {
    const steps = heapSteps(items([2, 1, 3]));
    expect(steps[0]?.picture?.nodes).toHaveLength(3);
    expect(last(steps).picture?.nodes).toEqual([]);
  });

  it("is not stable: equal items end reordered", () => {
    const steps = heapSteps(items([2, 2, 1], true));
    expect(resultOf(last(steps))).toEqual(["1", "2b", "2a"]);
  });
});
