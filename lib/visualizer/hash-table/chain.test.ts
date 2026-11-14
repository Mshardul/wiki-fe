import { describe, expect, it } from "vitest";
import { chainRun } from "./chain";
import { chainBadges, ins, op } from "./test-helpers";

const START = [[16, 8, 24], [], [], [], [], [5], [], []];

describe("chaining", () => {
  it("insert 32 walks three nodes", () => {
    const ev = chainRun(ins(32), 8, START);
    expect(chainBadges(ev)).toEqual(["Start", "Hash", "Walk", "Walk", "Walk", "Place", "Done"]);
    expect(ev[5]?.walked).toBe(3);
    expect(ev[6]?.chains[0]).toEqual([16, 8, 24, 32]);
  });

  it("defaults build the same chain", () => {
    const ev = chainRun(ins(16, 8, 24, 5, 32), 8);
    expect(ev).toHaveLength(18);
    const end = ev[ev.length - 1];
    expect(end?.chains[0]).toEqual([16, 8, 24, 32]);
    expect(end?.chains[5]).toEqual([5]);
  });

  it("delete from the middle relinks and lookup then walks two", () => {
    const ev = chainRun([op("delete", 8), op("lookup", 24)], 8, [
      [16, 8, 24, 32],
      [],
      [],
      [],
      [],
      [5],
      [],
      [],
    ]);
    expect(chainBadges(ev)).toEqual([
      "Start",
      "Hash",
      "Walk",
      "Walk",
      "Found",
      "Unlink",
      "Hash",
      "Walk",
      "Walk",
      "Found",
      "Done",
    ]);
    expect(ev[5]?.chains[0]).toEqual([16, 24, 32]);
    expect(ev[9]?.walked).toBe(2);
  });

  it("delete of the head and the tail relink", () => {
    const head = chainRun([op("delete", 16)], 8, [[16, 8, 24], [], [], [], [], [], [], []]);
    expect(head[head.length - 1]?.chains[0]).toEqual([8, 24]);
    const tail = chainRun([op("delete", 24)], 8, [[16, 8, 24], [], [], [], [], [], [], []]);
    expect(tail[tail.length - 1]?.chains[0]).toEqual([16, 8]);
  });

  it("missing key on an empty chain", () => {
    const ev = chainRun([op("delete", 99)], 8);
    expect(chainBadges(ev)).toEqual(["Start", "Hash", "Not found", "Done"]);
  });

  it("duplicate insert is found and adds nothing", () => {
    const ev = chainRun(ins(8, 8), 8);
    expect(chainBadges(ev)).toEqual(["Start", "Hash", "Place", "Hash", "Walk", "Found", "Done"]);
    expect(ev[6]?.chains[0]).toEqual([8]);
  });

  it("key 0 goes to slot 0 and size 1 uses one chain", () => {
    expect(chainRun(ins(0), 8)[2]?.home).toBe(0);
    const one = chainRun(ins(3, 4, 5), 1);
    expect(one[one.length - 1]?.chains).toEqual([[3, 4, 5]]);
  });

  it("no two adjacent events are identical", () => {
    const ev = chainRun([...ins(16, 8, 24, 32), op("delete", 8), op("lookup", 24)], 8);
    ev.forEach((e, i) => {
      const prev = ev[i - 1];
      if (prev) {
        const same = (x: typeof e) =>
          JSON.stringify([x.badge, x.chains, x.walking, x.key, x.walked]);
        expect(same(e)).not.toBe(same(prev));
      }
    });
  });
});
