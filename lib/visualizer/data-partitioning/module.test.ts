import { describe, expect, it } from "vitest";
import { parseState } from "../core/url-state";
import { DEFAULT_KEYS } from "./defaults";
import { PARTITION_SECTIONS, partitionModule } from "./module";
import type { SchemeId } from "./types";

const IDS: SchemeId[] = ["mod-n", "range", "ring", "directory", "rendezvous"];
const defaults = () => ({ ...partitionModule.defaults(), seed: 3 });
const result = (v: object) => partitionModule.run({ ...defaults(), ...v });

describe("module", () => {
  it("has the route's slug, a chip per variant in difficulty order and a Revision card each", () => {
    expect(partitionModule.slug).toBe("data-partitioning");
    expect(partitionModule.variants).toEqual({ key: "scheme" });
    expect(partitionModule.variants?.restartOnSwitch).toBeUndefined();
    const chips = PARTITION_SECTIONS[0]?.fields[0];
    expect(chips?.kind === "chips" && chips.options.map((o) => o.value)).toEqual(IDS);
    expect(partitionModule.revision).toHaveLength(5);
  });

  it("opens on 3 starting nodes, one Add and the hand-picked keys, under every variant", () => {
    const d = partitionModule.defaults();
    expect(d).toMatchObject({
      nodes: 4,
      events: ["+"],
      keys: DEFAULT_KEYS,
      vnodes: "4",
      scheme: "mod-n",
    });
    for (const scheme of IDS) {
      const r = result({ scheme });
      expect(r.frames, scheme).toHaveLength(17);
      expect(r.sequence).toEqual(DEFAULT_KEYS);
      expect(r.sequences).toEqual({ keys: DEFAULT_KEYS, events: ["+"] });
      expect(r.metricLabel).toBe("Keys moved");
    }
  });

  it("every variant gives the same frame count for the same input, so switching keeps the step", () => {
    for (const events of [[], ["+"], ["+", "-B"], ["-A", "+", "+"]]) {
      const nodes = 3 + events.reduce((n, t) => n + (t === "+" ? 1 : -1), 0);
      const counts = IDS.map((scheme) => result({ scheme, nodes, events }).frames.length);
      expect(new Set(counts).size).toBe(1);
      expect(counts[0]).toBe(8 + events.length * 9);
    }
  });

  it("final moved count per variant on the default run: 6, 2, 2, 2, 2 of 8", () => {
    const moved = IDS.map((scheme) => result({ scheme, vnodes: "1" }).frames.at(-1)?.metric);
    expect(moved).toEqual(["6/8", "2/8", "2/8", "2/8", "2/8"]);
  });

  it("every variant carries its article link, rule and about rows", () => {
    for (const scheme of IDS) {
      const info = result({ scheme }).info;
      expect(info.articleHref).toMatch(/^\/system-design\/algorithms\//);
      expect(info.rule.length).toBeGreaterThan(0);
      expect(info.about.length).toBeGreaterThanOrEqual(4);
      expect(info.tries).toHaveLength(2);
    }
  });

  it("is deterministic from the inputs and the seed", () => {
    expect(JSON.stringify(result({ scheme: "ring" }))).toBe(
      JSON.stringify(result({ scheme: "ring" })),
    );
  });

  it("the step lines light the line that ran", () => {
    const f = result({ scheme: "ring" }).frames;
    expect(f[0]?.path).toEqual([0, 1, 2]);
    expect(f[8]?.path).toEqual([3]);
  });
});

describe("Try presets", () => {
  // Each preset first moves the inputs away from the defaults, then applies its patch.
  const away = () => ({
    ...defaults(),
    nodes: 6,
    events: [],
    keys: ["1", "2", "3"],
    vnodes: "2",
    workload: "hot",
    seed: 1234,
  });
  const tried = (scheme: SchemeId, i: number) => {
    const t = partitionModule.run({ ...defaults(), scheme }).info.tries[i];
    if (!t) throw new Error("no preset");
    return partitionModule.run({ ...away(), scheme, ...t.patch });
  };
  const final = (scheme: SchemeId, i: number) => tried(scheme, i).frames.at(-1);
  const rows = (f: ReturnType<typeof final>) =>
    Object.fromEntries((f?.vars ?? []).map((v) => [v.name, v.value]));

  it("Mod-N: add one node, 6/8 move", () => {
    expect(final("mod-n", 0)?.metric).toBe("6/8");
  });

  it("Mod-N: removing a node still moves 5/8 although B held only 18 and 66", () => {
    const r = tried("mod-n", 1);
    expect(r.frames.at(-1)?.metric).toBe("5/8");
    const before = r.frames[7]?.model;
    const b =
      before?.kind === "bins"
        ? before.bins.find((x) => x.id === "B")?.items.map((i) => i.label)
        : null;
    expect(b).toEqual(["18", "66"]);
  });

  it("Range: sequential keys all land on C while A and B stay empty", () => {
    const f = tried("range", 0).frames.at(-1)?.model;
    expect(f?.kind === "runs" && f.braces.map((b) => b.note)).toEqual([
      "0 keys",
      "0 keys",
      "8 keys",
    ]);
  });

  it("Range: adding splits the hot range, C 66–93 and D 94–99, 4/8 moved", () => {
    const r = tried("range", 1).frames.at(-1);
    expect(r?.metric).toBe("4/8");
    const m = r?.model;
    expect(m?.kind === "runs" && m.braces.slice(-2).map((b) => [b.label, b.detail])).toEqual([
      ["C", "66–93"],
      ["D", "94–99"],
    ]);
  });

  it("Hash ring: eight positions give shares 33, 33, 34; one gives 26, 37, 37", () => {
    expect(rows(final("ring", 0))["Shares"]).toBe("A 33% · B 33% · C 34%");
    const one = partitionModule.run({
      ...away(),
      scheme: "ring",
      nodes: 3,
      events: [],
      vnodes: "1",
      keys: DEFAULT_KEYS,
    });
    expect(rows(one.frames.at(-1))["Shares"]).toBe("A 26% · B 37% · C 37%");
  });

  it("Hash ring: add takes one arc, 12 and 66 move into D from B", () => {
    const r = tried("ring", 1);
    const f = r.frames.at(-1);
    expect(f?.metric).toBe("2/8");
    const m = f?.model;
    expect(
      m?.kind === "circle" && m.points.filter((p) => p.changed).map((p) => [p.label, p.hue]),
    ).toEqual([
      ["12", 3],
      ["66", 3],
    ]);
    expect(
      r.frames[9]?.caption.map((p) => (typeof p === "string" ? p : p.text)).join(""),
    ).toContain("was B");
  });

  it("Directory: add moves only 79 and 97", () => {
    const f = final("directory", 0);
    expect(f?.metric).toBe("2/8");
    const m = f?.model;
    expect(
      m?.kind === "table" && m.lists[0]?.slots.filter((s) => s.changed).map((s) => s.index),
    ).toEqual(["79", "97"]);
  });

  it("Directory: the hot key 61 stays on A while 12 and 79 go to D", () => {
    const r = tried("directory", 1);
    const start = r.frames[7]?.model;
    const owner = (m: typeof start, k: string) =>
      m?.kind === "table" ? m.lists[0]?.slots.find((s) => s.index.startsWith(k))?.label : null;
    expect(owner(start, "61")).toBe("A");
    expect(owner(start, "12")).toBe("A");
    const end = r.frames.at(-1)?.model;
    expect(owner(end, "61")).toBe("A");
    expect(owner(end, "12")).toBe("D");
    expect(owner(end, "79")).toBe("D");
    expect(r.frames.at(-1)?.metric).toBe("2/8");
  });

  it("Rendezvous: add moves only what D wins, 29 and 97", () => {
    const f = final("rendezvous", 0);
    expect(f?.metric).toBe("2/8");
    const m = tried("rendezvous", 0)
      .frames.filter((x) => x.badge === "Moves")
      .map((x) => x.label);
    expect(m).toEqual(["29", "97"]);
  });

  it("Rendezvous: removing B sends 12 and 65 to A and 18 and 79 to C, nothing else moves", () => {
    const r = tried("rendezvous", 1);
    const moved = r.frames.filter((x) => x.badge === "Moves");
    expect(moved.map((x) => x.label)).toEqual(["12", "18", "65", "79"]);
    expect(moved.map((x) => rows(x)["Node now"])).toEqual(["A", "C", "A", "C"]);
    expect(r.frames.at(-1)?.metric).toBe("4/8");
  });

  it("every preset still runs from any starting inputs", () => {
    for (const scheme of IDS) {
      for (const i of [0, 1]) expect(() => tried(scheme, i)).not.toThrow();
    }
  });
});

describe("URL fallbacks", () => {
  it("a frame index past the new run falls back to step 1 through the player's clamp", () => {
    const parsed = parseState("?i=999&n=3&e=", PARTITION_SECTIONS, partitionModule.defaults());
    expect(partitionModule.run(parsed.values).frames.length).toBe(8);
    expect(parsed.view.frame).toBeGreaterThan(8);
  });
});
