import { describe, expect, it } from "vitest";
import { DEFAULT_TICKS, outcomes, stepsOf } from "../test-helpers";

describe("leaky bucket", () => {
  it("queues the burst's head, drops its tail and drains at its own pace", () => {
    expect(outcomes("leaky-bucket", DEFAULT_TICKS)).toBe("AAAARRRA");
  });

  it("knows when each queued request leaves and how long it waits", () => {
    const steps = stepsOf("leaky-bucket", DEFAULT_TICKS);
    expect(steps.map((s) => s.wait)).toEqual([
      { ticks: 2, leave: 6 },
      { ticks: 3, leave: 8 },
      { ticks: 5, leave: 10 },
      { ticks: 6, leave: 12 },
      undefined,
      undefined,
      undefined,
      { ticks: 3, leave: 14 },
    ]);
    expect(steps[3]?.detail).toBe("joins the queue at position 3, leaves at tick 12");
  });

  it("every scheduled leave is one pace after the last, however bursty the arrivals", () => {
    const end = stepsOf("leaky-bucket", DEFAULT_TICKS)[7]?.after;
    expect(end?.kind === "leaky" && end.leaves).toEqual([6, 8, 10, 12, 14]);
  });

  it("counts processed requests only once their leave tick has passed", () => {
    const steps = stepsOf("leaky-bucket", DEFAULT_TICKS);
    expect(steps[3]?.after).toMatchObject({ kind: "leaky", processed: 1, dropped: 0 });
    expect(steps[7]?.after).toMatchObject({ kind: "leaky", processed: 3, dropped: 3 });
  });

  it("reports the requests that left during the gap", () => {
    const steps = stepsOf("leaky-bucket", DEFAULT_TICKS);
    expect(steps[3]?.gap).toBe("1 processed while waiting");
    expect(steps[7]?.gap).toBe("2 processed while waiting");
    expect(steps[7]?.after.kind === "leaky" && steps[7].after.left).toEqual([2, 3]);
  });

  it("a full queue drops the tail, then the drain empties it before the next request", () => {
    const steps = stepsOf("leaky-bucket", [0, 0, 0, 0, 0, 0, 11]);
    expect(steps.map((s) => (s.ok ? "A" : "R")).join("")).toBe("AAARRRA");
    expect(steps[6]?.wait).toEqual({ ticks: 1, leave: 12 });
    expect(steps[5]?.after.kind === "leaky" && steps[5].after.leaves).toEqual([2, 4, 6]);
    expect(steps[3]?.detail).toBe("queue full (3/3), dropped");
  });

  it("the queue holds the requests whose leave tick has not come yet", () => {
    const steps = stepsOf("leaky-bucket", DEFAULT_TICKS);
    const q = steps[3]?.after.kind === "leaky" ? steps[3].after.queue : [];
    expect(q.map((r) => r.id)).toEqual([2, 3, 4]);
  });
});
