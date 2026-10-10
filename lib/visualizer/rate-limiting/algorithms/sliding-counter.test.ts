import { describe, expect, it } from "vitest";
import { DEFAULT_TICKS, outcomes, stepsOf } from "../test-helpers";

describe("sliding window counter", () => {
  it("weights the previous window and recovers once it no longer overlaps", () => {
    expect(outcomes("sliding-counter", DEFAULT_TICKS)).toBe("AAAARRRA");
  });

  it("shows the estimate arithmetic in each decision", () => {
    const steps = stepsOf("sliding-counter", DEFAULT_TICKS);
    expect(steps[3]?.detail).toBe("estimate 3 × 5/6 + 0 = 2.5 < 3");
    expect(steps[4]?.detail).toBe("estimate 3 × 5/6 + 1 = 3.5 ≥ 3");
    expect(steps[7]?.detail).toBe("estimate 3 × 0/6 + 1 = 1 < 3");
  });

  it("can be too generous: it admits a fourth request the log would reject", () => {
    expect(outcomes("sliding-counter", [5, 5, 5, 6, 7, 7])).toBe("AAAARR");
    expect(outcomes("sliding-log", [5, 5, 5, 6, 7, 7])).toBe("AAARRR");
  });

  it("can be too strict: it still counts part of a burst the log has forgotten", () => {
    expect(outcomes("sliding-counter", [0, 0, 0, 6, 6, 6])).toBe("AAAARR");
    expect(outcomes("sliding-log", [0, 0, 0, 6, 6, 6])).toBe("AAAAAA");
  });

  it("treats a skipped window as empty", () => {
    expect(outcomes("sliding-counter", [0, 0, 0, 12, 12, 12])).toBe("AAAAAA");
  });

  it("snapshots the previous, current, weight and scaled estimate", () => {
    const end = stepsOf("sliding-counter", DEFAULT_TICKS)[4]?.after;
    expect(end).toMatchObject({
      kind: "counter",
      window: 1,
      previous: 3,
      current: 1,
      weight: 5,
      scaled: 21,
    });
  });

  it("announces the window roll", () => {
    const steps = stepsOf("sliding-counter", DEFAULT_TICKS);
    expect(steps.map((s) => s.gap)).toEqual(["", "", "", "new window", "", "", "", ""]);
  });
});
