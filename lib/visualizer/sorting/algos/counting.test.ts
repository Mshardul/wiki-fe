import { describe, expect, it } from "vitest";
import { badges, counterOf, items, last, resultOf } from "../test-helpers";
import { countingSteps } from "./counting";

describe("counting steps", () => {
  const steps = countingSteps(items([2, 1, 2]));

  it("counts, turns counts into spots, then places", () => {
    expect(badges(steps)).toEqual([
      "Start",
      "Count",
      "Count",
      "Count",
      "Running totals",
      "Place",
      "Place",
      "Place",
      "Done",
    ]);
  });

  it("ends sorted, with 0 comparisons and 3 writes", () => {
    expect(resultOf(last(steps))).toEqual(["1", "2", "2"]);
    expect(counterOf(last(steps), "comparisons")).toBe("0");
    expect(counterOf(last(steps), "writes")).toBe("3");
  });

  it("is stable with tags", () => {
    expect(resultOf(last(countingSteps(items([2, 1, 2], true))))).toEqual(["1", "2a", "2b"]);
  });

  it("has input, counts for values 1-9 and an output with empty slots", () => {
    const rows = steps[2]?.array.rows;
    expect(rows).toHaveLength(3);
    expect(rows?.[1]?.indices).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    expect(rows?.[2]?.bars.every((b) => b === null)).toBe(true);
    expect(rows?.[1]?.pointers).toEqual([{ label: "+1", index: 0 }]);
  });
});
