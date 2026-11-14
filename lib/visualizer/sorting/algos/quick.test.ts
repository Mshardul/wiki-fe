import { describe, expect, it } from "vitest";
import { badges, counterOf, items, last, resultOf } from "../test-helpers";
import { quickSteps } from "./quick";

describe("quick steps", () => {
  const steps = quickSteps(items([3, 1, 2]));

  it("picks a pivot, partitions, then places it", () => {
    expect(badges(steps)).toEqual([
      "Start",
      "Pick pivot",
      "Compare",
      "Compare",
      "Swap",
      "Place pivot",
      "Done",
    ]);
  });

  it("ends sorted with the right counters", () => {
    expect(resultOf(last(steps))).toEqual(["1", "2", "3"]);
    expect(counterOf(last(steps), "comparisons")).toBe("2");
    expect(counterOf(last(steps), "swaps")).toBe("2");
  });

  it("labels the zones and pointers", () => {
    const compare = steps[3]?.array.rows[0];
    expect(compare?.zones.map((z) => z.label)).toEqual(["≥ pivot", "not looked at"]);
    expect(compare?.pointers.map((p) => p.label)).toEqual(["j", "pivot"]);
    const swap = steps[4]?.array.rows[0];
    expect(swap?.zones.map((z) => [z.label, z.tone])).toEqual([
      ["< pivot", "good"],
      ["≥ pivot", "warn"],
    ]);
    expect(swap?.pointers.map((p) => p.label)).toEqual(["i", "j", "pivot"]);
  });

  it("terminates on an all-equal input and ends Done", () => {
    const out = quickSteps(items([2, 2, 2, 2]));
    expect(last(out).badge).toBe("Done");
    expect(resultOf(last(out))).toEqual(["2", "2", "2", "2"]);
  });
});
