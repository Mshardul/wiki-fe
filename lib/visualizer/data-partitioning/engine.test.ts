import { describe, expect, it } from "vitest";
import { runPartition } from "./engine";
import { DEFAULT_KEYS, run } from "./test-helpers";
import { SCHEME_IDS } from "./types";

describe("engine", () => {
  it("emits K + E(1 + K) steps: 17 for the default run", () => {
    expect(run("mod-n", { events: ["+"] })).toHaveLength(17);
    expect(run("mod-n", { events: ["+", "-B"] })).toHaveLength(8 + 2 * 9);
    expect(run("mod-n")).toHaveLength(8);
  });
  it("orders place, event, re-check and sets outcomes by phase", () => {
    const steps = run("mod-n", { events: ["+"] });
    expect(steps.slice(0, 8).every((s) => s.phase === "place" && s.outcome === "neutral")).toBe(
      true,
    );
    expect(steps[8]?.phase).toBe("event");
    expect(steps[8]?.outcome).toBe("neutral");
    expect(steps.slice(9).every((s) => s.phase === "recheck")).toBe(true);
    // keys 12 18 61 65 66 79 move (bad), 29 and 97 stay (good)
    expect(steps.slice(9).map((s) => s.outcome)).toEqual([
      "bad",
      "bad",
      "good",
      "bad",
      "bad",
      "bad",
      "bad",
      "good",
    ]);
  });
  it("counts moved so far and the fewest possible per event", () => {
    const steps = run("mod-n", { events: ["+"] });
    expect(steps[8]?.fewest).toBe(2);
    expect(steps[8]?.moved).toBe(0);
    expect(steps.slice(9).map((s) => s.moved)).toEqual([1, 2, 2, 3, 4, 5, 6, 6]);
    expect(run("mod-n", { events: ["-B"] })[8]?.fewest).toBe(3);
  });
  it("leaves keys not yet re-checked on their old owner", () => {
    const steps = run("mod-n", { events: ["+"] });
    const first = steps[9];
    // after re-checking key 12 only, 12 is on D and the rest still on the old owners
    expect(first?.owners[0]).toBe("D");
    expect(first?.owners[1]).toBe("C");
    expect(first?.pending).toEqual([false, true, true, true, true, true, true, true]);
    expect(first?.fromOwner).toBe("B");
  });
  it("marks the joining and leaving node on the event steps only", () => {
    const add = run("ring", { events: ["+"] });
    expect(add[8]?.joining).toBe("D");
    expect(add[16]?.joining).toBe("D");
    const rm = run("ring", { events: ["-B"] });
    expect(rm[8]?.leaving).toBe("B");
    expect(rm[8]?.nodes).toEqual(["A", "C"]);
  });
  it("gives every scheme the same step count for one input", () => {
    const counts = SCHEME_IDS.map((s) => run(s, { events: ["+", "-A"] }).length);
    expect(new Set(counts).size).toBe(1);
  });
  it("never reuses a removed letter", () => {
    const steps = run("mod-n", { events: ["-B", "+"] });
    expect(steps[steps.length - 1]?.nodes).toEqual(["A", "C", "D"]);
  });
  it("ignores events that do not resolve", () => {
    const steps = runPartition({
      scheme: "mod-n",
      start: 3,
      vnodes: 1,
      keys: DEFAULT_KEYS.map((k) => ({ key: Number(k), hot: false })),
      events: ["-Z"],
    });
    expect(steps).toHaveLength(8);
  });
});
