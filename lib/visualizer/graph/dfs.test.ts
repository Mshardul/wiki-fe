import { describe, expect, it } from "vitest";
import { dfsRun } from "./dfs";
import { badges, edgesIn, expectNoRepeats, graphOf, lastOf, small, words } from "./test-helpers";

const F2 = words(`
  Start Push
  Check Push
  Check Skip Check Push
  Check Skip Pop
  Check Push
  Check Skip Check Push
  Check Skip Check Push
  Check Push
  Check Skip Check Skip Pop
  Check Skip Pop
  Check Push
  Check Skip Pop
  Pop Pop Pop
  Check Skip Pop
  Done`);

describe("dfsRun on the small graph from A", () => {
  const ev = dfsRun(small, "A", 0);

  it("follows the hand-checked sequence", () => {
    expect(ev).toHaveLength(43);
    expect(badges(ev)).toEqual(F2);
  });

  it("keeps the stack top first after every push and pop", () => {
    const stacks = ev.filter((e) => ["Push", "Pop"].includes(e.badge)).map((e) => e.work.join(""));
    expect(stacks).toEqual([
      "A",
      "BA",
      "DBA",
      "BA",
      "EBA",
      "GEBA",
      "FGEBA",
      "CFGEBA",
      "FGEBA",
      "GEBA",
      "HGEBA",
      "GEBA",
      "EBA",
      "BA",
      "A",
      "",
    ]);
    expect(Math.max(...ev.map((e) => e.work.length))).toBe(6);
  });

  it("numbers nodes at Push and ends with the right edges", () => {
    const end = lastOf(ev);
    expect(end.order.join("")).toBe("ABDEGFCH");
    expect(
      Object.entries(end.nodes)
        .map(([k, v]) => `${k}${v.order}`)
        .join(""),
    ).toBe("A1B2C7D3E4F6G5H8");
    expect(edgesIn(end, "tree")).toEqual(["A-B", "B-D", "B-E", "C-F", "E-G", "F-G", "G-H"]);
    expect(edgesIn(end, "skipped")).toEqual(["A-C"]);
  });

  it("counts 16 checks, 8 pushes, 8 pops and 9 skips", () => {
    const n = (b: string) => ev.filter((e) => e.badge === b).length;
    expect([n("Check"), n("Push"), n("Pop"), n("Skip")]).toEqual([16, 8, 8, 9]);
  });

  it("never repeats a picture", () => expectNoRepeats(ev));
});

describe("dfsRun edge cases", () => {
  it("handles a single node", () => {
    expect(badges(dfsRun(graphOf("A", []), "A", 0))).toEqual(["Start", "Push", "Pop", "Done"]);
  });

  it("leaves another component unseen and lists it", () => {
    const ev = dfsRun(
      graphOf("ABCD", [
        ["A", "B"],
        ["C", "D"],
      ]),
      "A",
      0,
    );
    expect(lastOf(ev).unreached).toEqual(["C", "D"]);
  });
});
