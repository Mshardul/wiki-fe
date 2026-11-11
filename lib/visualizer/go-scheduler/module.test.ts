import { describe, expect, it } from "vitest";
import { goSchedulerModule, runGoScheduler } from "./module";

describe("go scheduler module", () => {
  it("has four scenarios", () => {
    expect(
      ["happy", "syscall", "netpoll", "preempt"].map(
        (id) => runGoScheduler({ scenario: id }).frames.length,
      ),
    ).toEqual([7, 8, 7, 9]);
  });

  it("builds schedule models with P rows and lanes", () => {
    const run = runGoScheduler({ scenario: "happy" });
    const m = run.frames[0]?.model;
    expect(m?.kind).toBe("schedule");
    if (m?.kind === "schedule") {
      expect(m.rows.map((r) => r.id)).toEqual(["P0", "P1", "M0", "M1"]);
      expect(m.share?.lead).toBe("Go code on processors at");
      expect(m.note).toContain("Run queues:");
    }
  });

  it("groups preempt comparison steps by trace", () => {
    const frames = runGoScheduler({ scenario: "preempt" }).frames;
    expect(frames[0]?.group).toBe("Go 1.13 · cooperative only");
    expect(frames[3]?.group).toBe("Go 1.14+ · asynchronous preemption");
  });

  it("registers module metadata", () => {
    expect(goSchedulerModule.slug).toBe("inside-the-go-scheduler");
    expect(goSchedulerModule.defaults()).toEqual({ scenario: "happy" });
  });
});
