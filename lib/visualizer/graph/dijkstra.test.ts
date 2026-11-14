import { describe, expect, it } from "vitest";
import { dijkstraRun } from "./dijkstra";
import { badges, edgesIn, expectNoRepeats, graphOf, lastOf, weighted, words } from "./test-helpers";

const F3 = words(`
  Start Push
  Pop Check Relax Check Relax Finish
  Pop Check Keep Check Relax Check Relax Check Relax Finish
  Pop Check Keep Check Keep Check Relax Finish
  Stale
  Pop Check Keep Check Keep Check Relax Finish
  Stale
  Pop Check Keep Check Keep Finish
  Stale
  Done`);

const pqOf = (e: { pq: { dist: number; node: string }[] }) =>
  e.pq.map((p) => `${p.dist}${p.node}`).join(" ");

describe("dijkstraRun on the weighted graph from A", () => {
  const ev = dijkstraRun(weighted, "A", 0);

  it("follows the hand-checked sequence", () => {
    expect(ev).toHaveLength(44);
    expect(badges(ev)).toEqual(F3);
  });

  it("keeps the priority queue as in the fixture", () => {
    const pqs = ev.filter((e) => ["Push", "Pop", "Relax", "Stale"].includes(e.badge)).map(pqOf);
    expect(pqs).toEqual([
      "0A",
      "",
      "4B",
      "2C 4B",
      "4B",
      "3B 4B",
      "3B 4B 10D",
      "3B 4B 10D 12E",
      "4B 12E 10D",
      "4B 8D 10D 12E",
      "8D 12E 10D",
      "10D 12E",
      "10D 12E 10E",
      "10E 12E",
      "12E",
      "",
    ]);
    expect(Math.max(...ev.map((e) => e.pq.length))).toBe(4);
  });

  it("changes each distance badge as listed", () => {
    const seq = (n: string) => {
      const out: string[] = [];
      for (const e of ev) {
        const v = e.nodes[n]?.value;
        if (v !== undefined && v !== out[out.length - 1]) out.push(v);
      }
      return out;
    };
    expect(seq("A")).toEqual(["∞", "0"]);
    expect(seq("B")).toEqual(["∞", "4", "3"]);
    expect(seq("C")).toEqual(["∞", "2"]);
    expect(seq("D")).toEqual(["∞", "10", "8"]);
    expect(seq("E")).toEqual(["∞", "12", "10"]);
  });

  it("ends with the right order, tree and counts", () => {
    const end = lastOf(ev);
    expect(end.order.join("")).toBe("ACBDE");
    expect(edgesIn(end, "tree")).toEqual(["A-C", "B-C", "B-D", "D-E"]);
    expect(
      Object.entries(end.nodes)
        .map(([k, v]) => `${k}${v.value}`)
        .join(""),
    ).toBe("A0B3C2D8E10");
    const n = (b: string) => ev.filter((e) => e.badge === b).length;
    expect([n("Pop"), n("Stale"), n("Check"), n("Relax"), n("Keep")]).toEqual([5, 3, 14, 7, 7]);
    expect(end.metric).toBe("7");
  });

  it("sets popped on Pop and Stale only", () => {
    for (const e of ev) {
      expect(e.popped !== null).toBe(e.badge === "Pop" || e.badge === "Stale");
    }
  });

  it("never repeats a picture", () => expectNoRepeats(ev));
});

describe("dijkstraRun edge cases", () => {
  it("breaks ties by push order and never replaces an equal route", () => {
    const g = graphOf("ABCD", [
      ["A", "B", 1],
      ["A", "C", 1],
      ["B", "D", 1],
      ["C", "D", 1],
    ]);
    const ev = dijkstraRun(g, "A", 0);
    expect(lastOf(ev).order.join("")).toBe("ABCD");
    expect(edgesIn(lastOf(ev), "tree")).toContain("B-D");
    expect(edgesIn(lastOf(ev), "tree")).not.toContain("C-D");
    expect(badges(ev)).not.toContain("Stale");
    expect(ev.filter((e) => e.badge === "Relax" && e.other === "D")).toHaveLength(1);
  });

  it("leaves an unreachable node at infinity and lists it", () => {
    const ev = dijkstraRun(graphOf("ABC", [["A", "B", 2]]), "A", 0);
    expect(lastOf(ev).nodes.C?.value).toBe("∞");
    expect(lastOf(ev).unreached).toEqual(["C"]);
  });

  it("keeps a self-loop out of the way", () => {
    const ev = dijkstraRun(
      graphOf("AB", [
        ["A", "A", 3],
        ["A", "B", 1],
      ]),
      "A",
      0,
    );
    expect(badges(ev).slice(0, 6)).toEqual(["Start", "Push", "Pop", "Check", "Keep", "Check"]);
  });

  it("uses the lower weight of duplicate edges", () => {
    const ev = dijkstraRun(
      graphOf("AB", [
        ["A", "B", 5],
        ["B", "A", 3],
      ]),
      "A",
      0,
    );
    expect(lastOf(ev).nodes.B?.value).toBe("3");
  });

  it("handles a single node", () => {
    expect(badges(dijkstraRun(graphOf("A", []), "A", 0))).toEqual([
      "Start",
      "Push",
      "Pop",
      "Finish",
      "Done",
    ]);
  });
});
