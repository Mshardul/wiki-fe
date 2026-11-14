import { describe, expect, it } from "vitest";
import { bfsRun } from "./bfs";
import {
  badges,
  dag,
  edgesIn,
  expectNoRepeats,
  graphOf,
  lastOf,
  small,
  words,
} from "./test-helpers";

const F1 = words(`
  Start Enqueue
  Dequeue Check Discover Check Discover Finish
  Dequeue Check Skip Check Discover Check Discover Finish
  Dequeue Check Skip Check Discover Finish
  Dequeue Check Skip Finish
  Dequeue Check Skip Check Discover Finish
  Dequeue Check Skip Check Skip Finish
  Dequeue Check Skip Check Skip Check Discover Finish
  Dequeue Check Skip Finish
  Done`);

describe("bfsRun on the small graph from A", () => {
  const ev = bfsRun(small, "A", 0);

  it("follows the hand-checked sequence", () => {
    expect(ev).toHaveLength(51);
    expect(badges(ev)).toEqual(F1);
  });

  it("looks at the neighbours in order", () => {
    const others = ev.filter((e) => e.badge === "Check").map((e) => e.other);
    expect(others.join("")).toBe("BCADEAFBBGCGEFHG");
  });

  it("keeps the queue as in the fixture", () => {
    const queues = ev
      .filter((e) => ["Enqueue", "Dequeue", "Discover"].includes(e.badge))
      .map((e) => e.work.join(""));
    expect(queues).toEqual([
      "A",
      "",
      "B",
      "BC",
      "C",
      "CD",
      "CDE",
      "DE",
      "DEF",
      "EF",
      "F",
      "FG",
      "G",
      "",
      "H",
      "",
    ]);
  });

  it("numbers nodes at Dequeue and ends with the right edges", () => {
    const end = lastOf(ev);
    expect(end.order.join("")).toBe("ABCDEFGH");
    expect(
      Object.entries(end.nodes)
        .map(([k, v]) => `${k}${v.order}`)
        .join(""),
    ).toBe("A1B2C3D4E5F6G7H8");
    expect(edgesIn(end, "tree")).toEqual(["A-B", "A-C", "B-D", "B-E", "C-F", "E-G", "G-H"]);
    expect(edgesIn(end, "skipped")).toEqual(["F-G"]);
    expect(end.metric).toBe("8/8");
    expect(end.unreached).toEqual([]);
  });

  it("counts 16 checks, 7 discoveries and 9 skips", () => {
    const n = (b: string) => ev.filter((e) => e.badge === b).length;
    expect([n("Check"), n("Discover"), n("Skip")]).toEqual([16, 7, 9]);
  });

  it("never repeats a picture", () => expectNoRepeats(ev));
});

describe("bfsRun edge cases", () => {
  it("lists nodes it cannot reach", () => {
    const ev = bfsRun(dag, "C", 0);
    expect(lastOf(ev).order.join("")).toBe("CEF");
    expect(lastOf(ev).unreached).toEqual(["A", "B", "D"]);
    expect(lastOf(ev).badge).toBe("Done");
  });

  it("handles a single node", () => {
    expect(badges(bfsRun(graphOf("A", []), "A", 0))).toEqual([
      "Start",
      "Enqueue",
      "Dequeue",
      "Finish",
      "Done",
    ]);
  });

  it("skips a self-loop and keeps going", () => {
    const ev = bfsRun(
      graphOf("AB", [
        ["A", "A"],
        ["A", "B"],
      ]),
      "A",
      0,
    );
    expect(badges(ev)).toEqual([
      "Start",
      "Enqueue",
      "Dequeue",
      "Check",
      "Skip",
      "Check",
      "Discover",
      "Finish",
      "Dequeue",
      "Check",
      "Skip",
      "Finish",
      "Done",
    ]);
    expect(lastOf(ev).order.join("")).toBe("AB");
  });

  it("is deterministic per seed", () => {
    expect(bfsRun(small, "A", 7)).toEqual(bfsRun(small, "A", 7));
  });
});
