import { describe, expect, it } from "vitest";
import { DEFAULT_DURATIONS } from "./copy";
import { runBalancer } from "./engine";
import type { LbInput, LbStep, PolicyId } from "./types";

const DURATIONS = DEFAULT_DURATIONS.map(Number);
const run = (policy: PolicyId, o: Partial<LbInput> = {}): LbStep[] =>
  runBalancer({ policy, servers: 3, durations: DURATIONS, failure: null, ...o });

const landed = (steps: LbStep[]): number[] => {
  const out: number[] = [];
  for (const s of steps) {
    if (s.phase === "land" && s.from === null && s.request !== null) {
      out[s.request - 1] = s.server as number;
    }
  }
  return out;
};

describe("balancer engine", () => {
  it("round robin deals 1 2 3 1 2 3 1 and piles the long requests on S1", () => {
    expect(landed(run("round-robin"))).toEqual([0, 1, 2, 0, 1, 2, 0]);
  });

  it("weighted round robin takes weights 3, 2, 1 then refills", () => {
    expect(landed(run("weighted"))).toEqual([0, 0, 0, 1, 1, 2, 0]);
  });

  it("least connections sends r7 to S3, which ended r5 at tick 6", () => {
    const steps = run("least-connections");
    expect(landed(steps)).toEqual([0, 1, 2, 1, 2, 0, 2]);
    const decide = steps.find((s) => s.phase === "decide" && s.request === 7);
    expect(decide?.pick).toEqual({ kind: "counts", server: 2, counts: [2, 1, 0] });
  });

  it("ip hash keeps each client on one server: .4 and .7 on S2, .9 on S1", () => {
    expect(landed(run("ip-hash"))).toEqual([1, 1, 1, 0, 1, 1, 0]);
  });

  it("every request gets a decide step then a land step, and finishes once", () => {
    for (const policy of ["round-robin", "weighted", "least-connections", "ip-hash"] as const) {
      const steps = run(policy);
      for (let r = 1; r <= 7; r++) {
        const phases = steps.filter((s) => s.request === r).map((s) => s.phase);
        expect(phases, `${policy} r${r}`).toEqual(["decide", "land", "finish"]);
      }
    }
  });

  it("finishes come before an arrival at the same tick, so r5 frees S3 before r7 decides", () => {
    const steps = run("least-connections");
    const done = steps.findIndex((s) => s.phase === "finish" && s.request === 5);
    const decide = steps.findIndex((s) => s.phase === "decide" && s.request === 7);
    expect(done).toBeLessThan(decide);
    expect(steps[done]?.tick).toBe(6);
  });

  it("time left on a request is its end minus the tick", () => {
    const decide = run("round-robin").find((s) => s.phase === "decide" && s.request === 7);
    const r1 = decide?.flights.find((f) => f.request === 1);
    expect(r1).toMatchObject({ end: 9, total: 9 });
    expect(r1 && r1.end - (decide?.tick ?? 0)).toBe(3);
  });

  it("a failed server re-routes its requests one at a time, keeping their time left", () => {
    const steps = run("round-robin", { failure: 0 });
    const fail = steps.findIndex((s) => s.phase === "fail");
    expect(steps[fail]).toMatchObject({ server: 0, tick: 4 });
    expect(steps[fail]?.up).toEqual([false, true, true]);
    const moved = steps.slice(fail + 1).filter((s) => s.from === 0);
    expect(moved.map((s) => `${s.phase}:r${s.request}`)).toEqual([
      "decide:r1",
      "land:r1",
      "decide:r4",
      "land:r4",
    ]);
    // r1 had 5 ticks left at tick 4 and keeps them: its whole time is still 9.
    expect(moved[0]?.arriving).toMatchObject({ request: 1, total: 9, end: 9 });
    expect(moved[0]?.server).toBe(1);
    expect(moved[2]?.server).toBe(2);
  });

  it("no request is routed to a down server afterwards", () => {
    for (const policy of ["round-robin", "weighted", "least-connections", "ip-hash"] as const) {
      const steps = run(policy, { failure: 1 });
      const after = steps.slice(steps.findIndex((s) => s.phase === "fail") + 1);
      expect(
        after.filter((s) => s.phase === "decide" && s.server === 1),
        policy,
      ).toEqual([]);
    }
  });

  it("ip hash divides by the servers still up after a failure", () => {
    const steps = run("ip-hash", { failure: 1 });
    const decide = steps.find((s) => s.phase === "decide" && s.request === 5);
    expect(decide?.pick).toEqual({
      kind: "hash",
      server: 2,
      client: 7,
      alive: [0, 2],
      remainder: 1,
    });
  });

  it("fewer requests than the failure point still fail before the last one", () => {
    const steps = runBalancer({
      policy: "round-robin",
      servers: 3,
      durations: [4, 4],
      failure: 0,
    });
    expect(steps.filter((s) => s.phase === "fail")).toHaveLength(1);
  });
});
