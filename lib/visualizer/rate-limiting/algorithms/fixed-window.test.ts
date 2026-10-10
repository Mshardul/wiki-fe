import { describe, expect, it } from "vitest";
import { DEFAULT_TICKS, outcomes, stepsOf } from "../test-helpers";

describe("fixed window counter", () => {
  it("lets a burst straddling the boundary through twice", () => {
    expect(outcomes("fixed-window", DEFAULT_TICKS)).toBe("AAAAAARR");
  });

  it("rejects once the window is full when the burst stays inside it", () => {
    expect(outcomes("fixed-window", [1, 2, 2, 3, 3, 4, 4])).toBe("AAARRRR");
  });

  it("counts per clock-aligned window and says when the counter resets", () => {
    const steps = stepsOf("fixed-window", DEFAULT_TICKS);
    expect(steps.map((s) => s.gap)).toEqual([
      "",
      "",
      "",
      "new window, counter reset",
      "",
      "",
      "",
      "",
    ]);
    const end = steps[7]?.after;
    expect(end?.kind === "fixed" && end.counts).toEqual([3, 3]);
    expect(end?.kind === "fixed" && end.rejected).toEqual([0, 2]);
  });

  it("describes the decision", () => {
    const steps = stepsOf("fixed-window", DEFAULT_TICKS);
    expect(steps[3]?.detail).toBe("window 1 now 1/3");
    expect(steps[6]?.detail).toBe("window 1 already full (3/3)");
  });

  it("works with a window of two ticks", () => {
    expect(outcomes("fixed-window", [0, 0, 0, 2, 2, 2], 2, 1)).toBe("AARAAR");
  });
});
