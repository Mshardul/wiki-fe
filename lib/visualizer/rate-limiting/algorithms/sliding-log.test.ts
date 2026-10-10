import { describe, expect, it } from "vitest";
import { DEFAULT_TICKS, outcomes, stepsOf } from "../test-helpers";

describe("sliding window log", () => {
  it("never exceeds the limit inside any window", () => {
    expect(outcomes("sliding-log", DEFAULT_TICKS)).toBe("AAARRRRA");
  });

  it("slides: a full log keeps rejecting until its oldest entry ages out", () => {
    expect(outcomes("sliding-log", [5, 5, 5, 6, 7, 7])).toBe("AAARRR");
  });

  it("forgets a burst once it is a full window old", () => {
    expect(outcomes("sliding-log", [0, 0, 0, 6, 6, 6])).toBe("AAAAAA");
  });

  it("reports aged-out timestamps as the gap effect and keeps only the live ones", () => {
    const steps = stepsOf("sliding-log", DEFAULT_TICKS);
    expect(steps[7]?.gap).toBe("3 timestamps aged out");
    const end = steps[7]?.after;
    expect(end?.kind === "log" && end.kept).toEqual([11]);
    expect(steps[2]?.after.kind === "log" && steps[2].after.kept).toEqual([4, 5, 5]);
  });

  it("does not log rejected requests", () => {
    const steps = stepsOf("sliding-log", DEFAULT_TICKS);
    expect(steps[3]?.after.kind === "log" && steps[3].after.kept).toEqual([4, 5, 5]);
  });

  it("fills to the limit and no further", () => {
    expect(outcomes("sliding-log", [2, 2, 2, 2, 2, 3], 5, 2)).toBe("AAAAAR");
  });
});
