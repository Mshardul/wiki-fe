import { describe, expect, it } from "vitest";
import { badges, items, last, resultOf } from "../test-helpers";
import { bucketSteps } from "./bucket";

describe("bucket steps", () => {
  const steps = bucketSteps(items([7, 2, 5, 8, 1]));

  it("drops, sorts only crowded buckets, then collects", () => {
    expect(badges(steps)).toEqual([
      "Start",
      "Drop",
      "Drop",
      "Drop",
      "Drop",
      "Drop",
      "Sort bucket",
      "Sort bucket",
      "Collect",
      "Done",
    ]);
  });

  it("ends sorted", () => {
    expect(resultOf(last(steps))).toEqual(["1", "2", "5", "7", "8"]);
  });

  it("labels the three buckets by range", () => {
    expect(steps[1]?.array.rows[1]?.indices).toEqual(["1–3", "4–6", "7–9"]);
  });
});
