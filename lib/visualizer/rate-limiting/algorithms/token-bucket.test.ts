import { describe, expect, it } from "vitest";
import { DEFAULT_TICKS, outcomes, stepsOf } from "../test-helpers";

describe("token bucket", () => {
  it("spends the burst, then refills slowly", () => {
    expect(outcomes("token-bucket", DEFAULT_TICKS)).toBe("AAAARRRA");
  });

  it("a full bucket serves a burst of its size and then runs dry", () => {
    expect(outcomes("token-bucket", [10, 10, 10, 10])).toBe("AAAR");
  });

  it("after the burst, only the refill pace gets through", () => {
    expect(outcomes("token-bucket", [0, 0, 0, 1, 2, 3])).toBe("AAARAR");
  });

  it("reports refills as the gap effect, capped at the bucket size", () => {
    const steps = stepsOf("token-bucket", DEFAULT_TICKS);
    expect(steps.map((s) => s.gap)).toEqual([
      "",
      "",
      "",
      "+1 token refilled",
      "",
      "",
      "",
      "+2 tokens refilled",
    ]);
    expect(steps[7]?.detail).toBe("1 token left");
    expect(steps[4]?.detail).toBe("bucket empty");
  });

  it("tracks token ids: spend the oldest, refill adds new ones", () => {
    const steps = stepsOf("token-bucket", DEFAULT_TICKS);
    expect(steps[0]?.after).toMatchObject({
      kind: "token",
      tokens: [2, 3],
      spent: 1,
      refilled: [],
    });
    expect(steps[3]?.after).toMatchObject({ kind: "token", tokens: [], spent: 4, refilled: [4] });
  });

  it("says when the next token arrives, and nothing when the bucket is full", () => {
    const steps = stepsOf("token-bucket", DEFAULT_TICKS);
    expect(steps[3]?.after.kind === "token" && steps[3].after.nextIn).toBe(2);
    const full = stepsOf("token-bucket", [11]);
    expect(full[0]?.before.kind === "token" && full[0].before.nextIn).toBeNull();
  });

  it("never holds more than its capacity", () => {
    const steps = stepsOf("token-bucket", [0, 19]);
    expect(steps[1]?.after.kind === "token" && steps[1].after.tokens.length).toBeLessThanOrEqual(3);
  });
});
