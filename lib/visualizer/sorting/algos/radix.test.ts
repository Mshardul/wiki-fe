import { describe, expect, it } from "vitest";
import { badges, items, last, resultOf } from "../test-helpers";
import { radixSteps } from "./radix";

describe("radix steps", () => {
  const steps = radixSteps(items([21, 13, 22]));

  it("drops and collects once per digit", () => {
    expect(badges(steps)).toEqual([
      "Start",
      "Drop",
      "Drop",
      "Drop",
      "Collect",
      "Drop",
      "Drop",
      "Drop",
      "Collect",
      "Done",
    ]);
  });

  it("orders by the ones digit after the first collect", () => {
    expect(resultOf(steps[4] as (typeof steps)[number])).toEqual(["21", "22", "13"]);
    expect(resultOf(last(steps))).toEqual(["13", "21", "22"]);
  });

  it("uses ten digit buckets", () => {
    expect(steps[1]?.array.rows[1]?.indices).toHaveLength(10);
  });
});
