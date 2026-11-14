import { describe, expect, it } from "vitest";
import { badges, dag, dagCycle, expectNoRepeats, graphOf, lastOf, words } from "./test-helpers";
import { topoRun } from "./topo";

const F4 = words(`
  Start Count Ready Ready
  Take Reduce Finish
  Take Reduce Ready Reduce Ready Finish
  Take Reduce Finish
  Take Reduce Ready Finish
  Take Reduce Ready Finish
  Take Finish
  Done`);

const seq = (ev: ReturnType<typeof topoRun>, n: string) => {
  const out: string[] = [];
  for (const e of ev) {
    const v = e.nodes[n]?.value;
    if (v !== undefined && v !== out[out.length - 1]) out.push(v);
  }
  return out;
};

describe("topoRun on the DAG", () => {
  const ev = topoRun(dag, 0);

  it("follows the hand-checked sequence", () => {
    expect(ev).toHaveLength(27);
    expect(badges(ev)).toEqual(F4);
  });

  it("keeps the ready list as in the fixture", () => {
    const lists = ev.filter((e) => ["Ready", "Take"].includes(e.badge)).map((e) => e.work.join(""));
    expect(lists).toEqual(["A", "AB", "B", "", "C", "CD", "D", "", "E", "", "F", ""]);
  });

  it("lowers each in-degree badge as listed", () => {
    expect(seq(ev, "A")).toEqual(["0"]);
    expect(seq(ev, "B")).toEqual(["0"]);
    expect(seq(ev, "C")).toEqual(["2", "1", "0"]);
    expect(seq(ev, "D")).toEqual(["1", "0"]);
    expect(seq(ev, "E")).toEqual(["2", "1", "0"]);
    expect(seq(ev, "F")).toEqual(["1", "0"]);
  });

  it("outputs the order, consuming every edge", () => {
    const end = lastOf(ev);
    expect(end.order.join("")).toBe("ABCDEF");
    expect(Object.values(end.edges).every((s) => s === "consumed")).toBe(true);
    expect(end.metric).toBe("6/6");
  });

  it("never repeats a picture", () => expectNoRepeats(ev));
});

describe("topoRun with a cycle", () => {
  it("stops on Stuck naming the leftover nodes", () => {
    const ev = topoRun(dagCycle, 0);
    expect(ev).toHaveLength(17);
    expect(badges(ev)).toEqual(
      words(`Start Count Ready Ready Take Reduce Finish Take Reduce Reduce Ready Finish
             Take Reduce Finish Stuck Done`),
    );
    const stuck = ev.find((e) => e.badge === "Stuck");
    expect(stuck?.note).toBe("C E F");
    expect(lastOf(ev).order).toEqual(["A", "B", "D"]);
    expect(lastOf(ev).unreached).toEqual(["C", "E", "F"]);
    expect(seq(ev, "C")).toEqual(["3", "2", "1"]);
  });

  it("never frees a node with a self-loop", () => {
    const ev = topoRun(
      graphOf(
        "AB",
        [
          ["A", "A"],
          ["A", "B"],
        ],
        true,
      ),
      0,
    );
    expect(badges(ev)).toContain("Stuck");
    expect(lastOf(ev).order).toEqual([]);
  });

  it("handles a single node", () => {
    expect(badges(topoRun(graphOf("A", [], true), 0))).toEqual([
      "Start",
      "Count",
      "Ready",
      "Take",
      "Finish",
      "Done",
    ]);
  });

  it("keeps declaration order for equal readiness", () => {
    const ev = topoRun(
      graphOf(
        "ABC",
        [
          ["B", "C"],
          ["A", "C"],
        ],
        true,
      ),
      0,
    );
    expect(lastOf(ev).order.join("")).toBe("ABC");
  });
});
