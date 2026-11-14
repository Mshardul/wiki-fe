import { describe, expect, it } from "vitest";
import { chainRun } from "./chain";
import { openRun } from "./open";
import { resizeRun } from "./resize";
import { cellsOf, FIXTURE, ins, op } from "./test-helpers";
import { chainCtx, chainModelOf, chainVarsOf, openModelOf, openVarsOf, type ViewCtx } from "./view";

const ctx = (scheme: ViewCtx["scheme"], threshold: number | null = null): ViewCtx => ({
  scheme,
  maxChain: 1,
  threshold,
  meterMax: 1,
});
const tones = (m: ReturnType<typeof openModelOf>, list = 0) =>
  m.lists[list]?.slots.map((s) => s.tone);

describe("open addressing view", () => {
  const ev = openRun(ins(32), "linear", 8, cellsOf(FIXTURE));
  const c = ctx("linear");

  it("shows the probe in play, the taken slots, the arcs and the chip", () => {
    const m = openModelOf(ev[6] as (typeof ev)[number], c);
    expect(tones(m)?.slice(0, 4)).toEqual(["warn", "warn", "focus", "plain"]);
    expect(m.lists[0]?.hops.map((h) => h.label)).toEqual(["+1", "+2"]);
    expect(m.lists[0]?.hops.map((h) => h.current)).toEqual([false, true]);
    expect(m.lists[0]?.chip).toEqual({ label: "32", lines: ["32 mod 8 = 0"], to: 0 });
  });

  it("marks the placed slot green with every arc, and Done clears the overlay", () => {
    const placed = openModelOf(ev[9] as (typeof ev)[number], c);
    expect(placed.lists[0]?.slots[3]?.tone).toBe("good");
    expect(placed.lists[0]?.hops.map((h) => h.label)).toEqual(["+1", "+2", "+3"]);
    const done = openModelOf(ev[10] as (typeof ev)[number], c);
    expect(done.lists[0]?.chip).toBeNull();
    expect(done.lists[0]?.hops).toEqual([]);
    expect(tones(done)?.every((t) => t === "plain")).toBe(true);
    expect(done.lists[0]?.runs).toEqual([{ from: 0, to: 3 }]);
  });

  it("vars carry the probe count and the load arithmetic", () => {
    const rows = openVarsOf(ev[8] as (typeof ev)[number], c);
    expect(rows).toContainEqual({ name: "probe", value: "4" });
    expect(rows).toContainEqual({ name: "load", value: "4 / 8 = 0.5" });
  });

  it("quadratic arcs are offsets 1 and 4", () => {
    const q = openRun(ins(32), "quadratic", 8, cellsOf(FIXTURE));
    const m = openModelOf(q[7] as (typeof q)[number], ctx("quadratic"));
    expect(m.lists[0]?.hops.map((h) => h.label)).toEqual(["+1", "+4"]);
  });

  it("double hashing shows the second hash on the chip and in the arc offsets", () => {
    const d = openRun(ins(32), "double", 8, cellsOf(FIXTURE));
    const dc = ctx("double");
    expect(openModelOf(d[1] as (typeof d)[number], dc).lists[0]?.chip?.lines).toEqual([
      "32 mod 8 = 0",
      "1 + 32 mod 7 = 5",
    ]);
    expect(openModelOf(d[9] as (typeof d)[number], dc).lists[0]?.hops.map((h) => h.label)).toEqual([
      "+5",
      "+10",
      "+15",
    ]);
    expect(openVarsOf(d[1] as (typeof d)[number], dc)).toContainEqual({ name: "step", value: "5" });
  });

  it("a marker is a marked slot", () => {
    const m = openRun([op("delete", 8)], "linear", 8, cellsOf(FIXTURE));
    const mark = m.find((e) => e.badge === "Mark") as (typeof m)[number];
    expect(openModelOf(mark, c).lists[0]?.slots[1]?.state).toBe("marked");
  });
});

describe("chaining view", () => {
  const start = [[16, 8, 24], [], [], [], [], [5], [], []];
  const ev = chainRun(ins(32), 8, start);
  const cc = chainCtx(ev);

  it("outlines visited items, rings the one in play and greens the new item", () => {
    const walk = chainModelOf(ev[4] as (typeof ev)[number], cc).lists[0]?.slots[0];
    expect(walk?.nodes.map((n) => n.label)).toEqual(["16", "8", "24"]);
    expect(walk?.nodes.map((n) => n.outlined === true)).toEqual([true, true, true]);
    expect(walk?.nodes.map((n) => n.tone)).toEqual(["plain", "plain", "focus"]);
    const placed = chainModelOf(ev[5] as (typeof ev)[number], cc).lists[0]?.slots[0];
    expect(placed?.nodes[3]).toMatchObject({ label: "32", tone: "good" });
  });

  it("reserves room for the longest chain and no arc lane", () => {
    const l = chainModelOf(ev[1] as (typeof ev)[number], cc).lists[0];
    expect(cc.maxChain).toBe(4);
    expect(l?.room).toBe(4);
    expect(l?.lane).toBe(false);
  });

  it("vars carry the walk and the chain length", () => {
    expect(chainVarsOf(ev[4] as (typeof ev)[number])).toEqual([
      { name: "slot", value: "0" },
      { name: "walked", value: "3" },
      { name: "chain length", value: "3" },
      { name: "load", value: "4 / 8 = 0.5" },
    ]);
  });

  it("the meter scale of the defaults stays 1", () => {
    expect(chainCtx(chainRun(ins(16, 8, 24, 5, 32), 8)).meterMax).toBe(1);
  });
});

describe("resize view", () => {
  const ev = resizeRun(ins(16, 8, 24, 5, 32, 13, 21), 8, 0.75);
  const rc = ctx("linear", 0.75);

  it("shows the old table fading while the new one fills", () => {
    const grow = openModelOf(ev.find((e) => e.badge === "Grow") as (typeof ev)[number], rc);
    expect(grow.lists).toHaveLength(2);
    expect(grow.lists[0]?.faded).toBe(true);
    expect(grow.lists[1]?.slots).toHaveLength(16);
    expect(grow.meter?.mark).toBe(0.75);
    expect(grow.meter?.markLabel).toBe("0.75");
    const move = openModelOf(ev.find((e) => e.badge === "Move") as (typeof ev)[number], rc);
    expect(move.lists[0]?.slots[0]?.tone).toBe("accent");
    expect(move.lists[1]?.chip?.lines).toEqual(["16 mod 16 = 0"]);
    const sw = openModelOf(ev.find((e) => e.badge === "Switch") as (typeof ev)[number], rc);
    expect(sw.lists).toHaveLength(1);
  });
});

describe("every frame is distinct and the layout is fixed", () => {
  const runs: { name: string; models: string[]; layout: string[] }[] = [];
  const addOpen = (name: string, ev: ReturnType<typeof openRun>, c: ViewCtx) => {
    const models = ev.map((e) => openModelOf(e, c));
    runs.push({
      name,
      models: models.map((m) => JSON.stringify(m)),
      layout: models.map((m) =>
        JSON.stringify(m.lists.map((l) => [l.room, l.lane, l.slots.length])),
      ),
    });
  };
  addOpen("linear", openRun(ins(16, 8, 24, 5, 32), "linear", 8), ctx("linear"));
  addOpen("quad stuck", openRun(ins(16, 8, 24, 32), "quadratic", 8), ctx("quadratic"));
  addOpen("double", openRun(ins(16, 8, 24, 5, 32), "double", 8), ctx("double"));
  addOpen(
    "marker",
    openRun([op("delete", 8), op("lookup", 24), ...ins(32)], "linear", 8, cellsOf(FIXTURE)),
    ctx("linear"),
  );
  addOpen("full", openRun(ins(0, 1, 2, 3, 4), "linear", 4), ctx("linear"));
  const chain = chainRun(
    [...ins(16, 8, 24, 5, 32), op("delete", 8), op("lookup", 24), op("lookup", 99)],
    8,
  );
  const cc = chainCtx(chain);
  const cm = chain.map((e) => chainModelOf(e, cc));
  runs.push({
    name: "chain",
    models: cm.map((m) => JSON.stringify(m)),
    layout: cm.map((m) => JSON.stringify(m.lists.map((l) => [l.room, l.lane, l.slots.length]))),
  });
  const rz = resizeRun(ins(16, 8, 24, 5, 32, 13, 21), 8, 0.75);
  const rm = rz.map((e) => JSON.stringify(openModelOf(e, ctx("linear", 0.75))));
  runs.push({ name: "resize", models: rm, layout: [] });

  for (const r of runs) {
    it(`${r.name}: no two adjacent models are identical`, () => {
      r.models.forEach((m, i) => {
        if (i > 0) expect(m).not.toBe(r.models[i - 1]);
      });
    });
    if (r.layout.length > 0) {
      it(`${r.name}: slot layout never changes`, () => {
        expect(new Set(r.layout).size).toBe(1);
      });
    }
  }
});
