import { describe, expect, it } from "vitest";
import { badges, counterOf, items, last, resultOf } from "../test-helpers";
import { insertionSteps } from "./insertion";

describe("insertion steps", () => {
  const steps = insertionSteps(items([3, 1, 2]));

  it("compares then swaps one move at a time", () => {
    expect(badges(steps)).toEqual([
      "Start",
      "Compare",
      "Swap",
      "Compare",
      "Swap",
      "Compare",
      "Done",
    ]);
  });

  it("ends sorted with the right counters", () => {
    expect(resultOf(last(steps))).toEqual(["1", "2", "3"]);
    expect(counterOf(last(steps), "comparisons")).toBe("3");
    expect(counterOf(last(steps), "swaps")).toBe("2");
  });

  it("shows the sorted prefix as a green zone and the pointers i and j", () => {
    const compare = steps[1];
    expect(compare?.array.rows[0]?.zones[0]).toMatchObject({ from: 0, to: 1, tone: "good" });
    expect(compare?.array.rows[0]?.pointers.map((p) => p.label)).toEqual(["i", "j"]);
  });

  it("keeps equal items in order", () => {
    const out = insertionSteps(items([2, 2, 1], true));
    expect(resultOf(last(out))).toEqual(["1", "2a", "2b"]);
  });
});
