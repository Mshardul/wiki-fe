import { describe, expect, it } from "vitest";
import { badges, counterOf, items, last, resultOf } from "../test-helpers";
import { mergeSteps } from "./merge";

describe("merge steps", () => {
  const steps = mergeSteps(items([3, 1, 2]));

  it("splits, then merges with compare, take and copy back", () => {
    expect(badges(steps)).toEqual([
      "Start",
      "Split",
      "Split",
      "Compare",
      "Take",
      "Take",
      "Copy back",
      "Compare",
      "Take",
      "Compare",
      "Take",
      "Take",
      "Copy back",
      "Done",
    ]);
  });

  it("ends sorted: 3 comparisons, 5 writes", () => {
    expect(resultOf(last(steps))).toEqual(["1", "2", "3"]);
    expect(counterOf(last(steps), "comparisons")).toBe("3");
    expect(counterOf(last(steps), "writes")).toBe("5");
  });

  it("has a main row with L and R and an aux row filling from the left", () => {
    expect(steps[3]?.array.rows[0]?.pointers.map((p) => p.label)).toEqual(["L", "R"]);
    const afterFirstTake = steps[4]?.array;
    expect(afterFirstTake?.rows).toHaveLength(2);
    expect(afterFirstTake?.rows[0]?.bars.filter((b) => b?.faded)).toHaveLength(1);
    const aux = afterFirstTake?.rows[1];
    expect(aux?.label).toBe("merged so far");
    expect(aux?.bars.map((b) => b?.value ?? null)).toEqual([1, null, null]);
    expect(aux?.next).toBe(1);
  });

  it("keeps equal items in order", () => {
    expect(resultOf(last(mergeSteps(items([2, 2, 1], true))))).toEqual(["1", "2a", "2b"]);
  });
});
