import { describe, expect, it } from "vitest";
import { bipartiteRun } from "./bipartite";
import {
  badges,
  edgesIn,
  expectNoRepeats,
  graphOf,
  lastOf,
  ringEven,
  ringOdd,
  words,
} from "./test-helpers";

describe("bipartiteRun on the even ring from A", () => {
  const ev = bipartiteRun(ringEven, "A", 0);

  it("follows the hand-checked sequence", () => {
    expect(ev).toHaveLength(39);
    expect(badges(ev)).toEqual(
      words(`Start Colour
        Dequeue Check Colour Check Colour Finish
        Dequeue Check Fine Check Colour Finish
        Dequeue Check Fine Check Colour Finish
        Dequeue Check Fine Check Colour Finish
        Dequeue Check Fine Check Fine Finish
        Dequeue Check Fine Check Fine Finish
        Done`),
    );
  });

  it("ends with two sides and a bipartite note", () => {
    const end = lastOf(ev);
    const side = (s: "a" | "b") =>
      Object.entries(end.nodes)
        .filter(([, v]) => v.side === s)
        .map(([k]) => k)
        .join("");
    expect([side("a"), side("b")]).toEqual(["ACE", "BDF"]);
    expect(end.note).toBe("bipartite");
    expect(end.metric).toBe("6/6");
  });

  it("never repeats a picture", () => expectNoRepeats(ev));
});

describe("bipartiteRun on the odd ring from A", () => {
  const ev = bipartiteRun(ringOdd, "A", 0);

  it("stops on a conflict at C-D", () => {
    expect(ev).toHaveLength(26);
    expect(badges(ev)).toEqual(
      words(`Start Colour
        Dequeue Check Colour Check Colour Finish
        Dequeue Check Fine Check Colour Finish
        Dequeue Check Fine Check Colour Finish
        Dequeue Check Fine Check Conflict Done`),
    );
    const c = ev.find((e) => e.badge === "Conflict");
    expect([c?.node, c?.other]).toEqual(["C", "D"]);
    expect(edgesIn(lastOf(ev), "conflict")).toEqual(["C-D"]);
    expect(lastOf(ev).note).toBe("not bipartite");
    expect(lastOf(ev).nodes.C?.state).toBe("current");
  });

  it("never repeats a picture", () => expectNoRepeats(ev));
});

describe("bipartiteRun edge cases", () => {
  it("continues into another component", () => {
    const ev = bipartiteRun(
      graphOf("ABCD", [
        ["A", "B"],
        ["C", "D"],
      ]),
      "A",
      0,
    );
    expect(badges(ev).filter((b) => b === "Next component")).toHaveLength(1);
    expect(lastOf(ev).metric).toBe("4/4");
    expect(lastOf(ev).note).toBe("bipartite");
  });

  it("handles a single node", () => {
    expect(badges(bipartiteRun(graphOf("A", []), "A", 0))).toEqual([
      "Start",
      "Colour",
      "Dequeue",
      "Finish",
      "Done",
    ]);
  });

  it("conflicts on a self-loop", () => {
    const ev = bipartiteRun(graphOf("A", [["A", "A"]]), "A", 0);
    expect(badges(ev)).toContain("Conflict");
    expect(lastOf(ev).note).toBe("not bipartite");
  });

  it("ignores edge direction", () => {
    const g = graphOf(
      "ABC",
      [
        ["A", "B"],
        ["C", "B"],
      ],
      true,
    );
    expect(lastOf(bipartiteRun(g, "A", 0)).note).toBe("bipartite");
  });
});
