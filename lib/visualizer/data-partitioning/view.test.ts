import { describe, expect, it } from "vitest";
import { richText } from "../core/rich";
import type { BinsModel, CircleModel, RunsModel, TableModel } from "../core/shapes";
import { DEFAULT_KEYS } from "./defaults";
import { partitionFrames } from "./frames";
import { toKeyItems } from "./keys";
import type { SchemeId } from "./types";

const frames = (
  scheme: SchemeId,
  o: { vnodes?: number; keys?: string[]; events?: string[] } = {},
) =>
  partitionFrames({
    scheme,
    start: 3,
    vnodes: o.vnodes ?? 1,
    keys: toKeyItems(o.keys ?? DEFAULT_KEYS),
    events: o.events ?? ["+"],
  });
const text = (f: { caption: Parameters<typeof richText>[0] }) => richText(f.caption);
const labels = (b: BinsModel, id: string) =>
  b.bins.find((x) => x.id === id)?.items.map((i) => i.label);

// Keys 12 18 29 61 65 66 79 97 hash to 55 77 84 68 16 53 34 0. Steps: 0-7 place, 8 event, 9-16 re-check.
describe("Mod-N bins", () => {
  const f = frames("mod-n");

  it("after the placements: A 29 97, B 12 65 79, C 18 61 66", () => {
    const m = f[7]?.model as BinsModel;
    expect(labels(m, "A")).toEqual(["29", "97"]);
    expect(labels(m, "B")).toEqual(["12", "65", "79"]);
    expect(labels(m, "C")).toEqual(["18", "61", "66"]);
    expect(m.bins.map((b) => b.count)).toEqual(["2", "3", "3"]);
  });

  it("shows the arithmetic with N filled in", () => {
    expect(text(f[3] as never)).toBe("h(61) = 68 → 68 mod 3 = 2 → C");
    expect((f[3]?.model as BinsModel).active).toBe("k3");
  });

  it("the event step adds an empty new bin and fades every key", () => {
    const m = f[8]?.model as BinsModel;
    expect(m.bins.map((b) => b.id)).toEqual(["A", "B", "C", "D"]);
    expect(m.bins[3]?.state).toBe("new");
    expect(m.bins[3]?.items).toEqual([]);
    expect(m.bins.flatMap((b) => b.items).every((i) => i.pending)).toBe(true);
    expect(text(f[8] as never)).toBe("Add D: N goes from 3 to 4. Every key is checked again.");
    expect(f[8]?.metric).toBe("0/8");
  });

  it("re-checking 12 moves it B → D with a ring and settles it ahead of the pending keys", () => {
    const m = f[9]?.model as BinsModel;
    const d = m.bins.find((b) => b.id === "D");
    expect(d?.items).toEqual([{ id: "k0", label: "12", changed: true }]);
    expect(m.bins.find((b) => b.id === "B")?.items.map((i) => i.label)).toEqual(["65", "79"]);
    expect(text(f[9] as never)).toBe("h(12) = 55 → 55 mod 4 = 3 → D · was B");
    expect(f[9]).toMatchObject({ outcome: "bad", badge: "Moves", metric: "1/8" });
  });

  it("re-checking 29 stays on A and rings only the keys that moved", () => {
    const m = f[11]?.model as BinsModel;
    expect(f[11]).toMatchObject({ outcome: "good", badge: "Stays" });
    expect(text(f[11] as never)).toBe("h(29) = 84 → 84 mod 4 = 0 → A · stays");
    const ringed = m.bins.flatMap((b) => b.items.filter((i) => i.changed).map((i) => i.label));
    expect(ringed.sort()).toEqual(["12", "18"]);
  });

  it("ends with 6 of 8 moved and 2 as the fewest possible", () => {
    expect(f[16]?.metric).toBe("6/8");
    const rows = Object.fromEntries((f[16]?.vars ?? []).map((v) => [v.name, v.value]));
    expect(rows["Moved this event"]).toBe("6/8");
    expect(rows["Fewest possible"]).toBe("2");
    const m = f[16]?.model as BinsModel;
    const ringed = m.bins.flatMap((b) => b.items.filter((i) => i.changed).map((i) => i.label));
    expect(ringed.sort()).toEqual(["12", "18", "61", "65", "66", "79"]);
  });

  it("clears the rings when the next event starts", () => {
    const g = frames("mod-n", { events: ["+", "+"] });
    const m = g[17]?.model as BinsModel;
    expect(m.bins.flatMap((b) => b.items).some((i) => i.changed)).toBe(false);
  });

  it("keeps one height: slots is the tallest bin over the whole run", () => {
    expect((f[0]?.model as BinsModel).slots).toBe((f[16]?.model as BinsModel).slots);
    expect((f[0]?.model as BinsModel).slots).toBe(4);
  });

  it("makes a hot key two cells and counts load by weight", () => {
    const g = frames("mod-n", { keys: ["12*", "18"], events: [] });
    const m = g[1]?.model as BinsModel;
    expect(m.bins.flatMap((b) => b.items).find((i) => i.heavy)?.label).toBe("12 ×5");
    expect(m.bins.find((b) => b.items.some((i) => i.heavy))?.count).toBe("5");
  });

  it("a removed node's bin stays, dimmed, until the re-check ends", () => {
    const g = frames("mod-n", { events: ["-B"] });
    const m = g[8]?.model as BinsModel;
    expect(m.bins.find((b) => b.id === "B")?.state).toBe("removed");
    expect((g[g.length - 1]?.model as BinsModel).bins.find((b) => b.id === "B")?.items).toEqual([]);
  });
});

describe("Range runs", () => {
  const f = frames("range");

  it("starts as A[0–32] 12 18 29, B[33–65] 61 65, C[66–99] 66 79 97", () => {
    const m = f[7]?.model as RunsModel;
    expect(m.cells.map((c) => c.label)).toEqual(["12", "18", "29", "61", "65", "66", "79", "97"]);
    expect(m.braces.map((b) => [b.label, b.detail, b.note])).toEqual([
      ["A", "0–32", "3 keys"],
      ["B", "33–65", "2 keys"],
      ["C", "66–99", "3 keys"],
    ]);
  });

  it("the event step cuts A at its middle key: A 0–17 and a new D 18–32, cells still old colours", () => {
    const m = f[8]?.model as RunsModel;
    expect(m.braces.map((b) => [b.label, b.detail])).toEqual([
      ["A", "0–17"],
      ["D", "18–32"],
      ["B", "33–65"],
      ["C", "66–99"],
    ]);
    expect(m.braces[1]?.state).toBe("new");
    expect(m.cells[1]?.hue).toBe(0);
    expect(m.cells.every((c) => c.pending)).toBe(true);
    expect(text(f[8] as never)).toBe(
      "Add D: the fullest range splits at its middle key; D takes 18–32.",
    );
  });

  it("re-checking 18 recolours it D and rings it; 29 follows", () => {
    expect(f[10]?.metric).toBe("1/8");
    const m = f[11]?.model as RunsModel;
    expect(m.cells.filter((c) => c.changed).map((c) => c.label)).toEqual(["18", "29"]);
    expect(m.cells[1]?.hue).toBe(3);
    expect(f[16]?.metric).toBe("2/8");
  });

  it("shows an empty range as a brace over a placeholder", () => {
    const m = f[0]?.model as RunsModel;
    expect(m.cells.map((c) => c.label)).toEqual(["12"]);
    expect(m.braces.map((b) => [b.label, b.note, b.from > b.to])).toEqual([
      ["A", "1 key", false],
      ["B", "0 keys", true],
      ["C", "0 keys", true],
    ]);
  });

  it("sequential keys land in one range and the others stay empty", () => {
    const seq = frames("range", { keys: "90 91 92 93 94 95 96 97".split(" "), events: [] });
    const m = seq[seq.length - 1]?.model as RunsModel;
    expect(m.braces.map((b) => b.note)).toEqual(["0 keys", "0 keys", "8 keys"]);
  });

  it("a Remove merges the range into its lower neighbour", () => {
    const g = frames("range", { events: ["-B"] });
    expect(text(g[8] as never)).toBe("Remove B: its range merges into A, which now covers 0–65.");
  });
});

describe("Hash ring circle", () => {
  const f = frames("ring");

  it("one position per node: A at 48 holds 1, B at 85 holds 5, C at 22 holds 2", () => {
    const m = f[7]?.model as CircleModel;
    expect(m.anchors.map((a) => [a.label, a.at, a.count])).toEqual([
      ["A", 48, "1"],
      ["B", 85, "5"],
      ["C", 22, "2"],
    ]);
    expect(m.anchors.filter((a) => a.hot).map((a) => a.label)).toEqual(["B"]);
    expect(m.ideal).toBeCloseTo(8 / 3);
  });

  it("owner arcs run from the previous position to this one", () => {
    const m = f[7]?.model as CircleModel;
    expect(m.arcs).toEqual([
      { from: 85, to: 22, hue: 2 },
      { from: 22, to: 48, hue: 0 },
      { from: 48, to: 85, hue: 1 },
    ]);
  });

  it("keys sit at their hash and the walk runs from there clockwise to the owner", () => {
    const m = f[0]?.model as CircleModel;
    expect(m.points).toEqual([{ id: "k0", at: 55, label: "12", hue: 1 }]);
    expect(m.walk).toEqual({ from: 55, to: 85 });
    expect(text(f[0] as never)).toBe("h(12) = 55 → clockwise to B");
  });

  it("no walk on the event step, and Add D brings a new anchor", () => {
    const m = f[8]?.model as CircleModel;
    expect(m.walk).toBeNull();
    expect(m.anchors.find((a) => a.label === "D")).toMatchObject({ at: 59, state: "new" });
  });

  it("rings exactly the two keys that move into D: 12 and 66", () => {
    const m = f[16]?.model as CircleModel;
    expect(m.points.filter((p) => p.changed).map((p) => p.label)).toEqual(["12", "66"]);
    expect(f[16]?.metric).toBe("2/8");
  });

  it("virtual nodes add small unlabelled markers and name the position hit", () => {
    const g = frames("ring", { vnodes: 4 });
    const m = g[7]?.model as CircleModel;
    expect(m.anchors.find((a) => a.label === "A")?.extra).toEqual([88, 1, 45]);
    expect(text(g[0] as never)).toBe("h(12) = 55 → clockwise to B·3 at 62");
    const shares = g[7]?.vars.find((v) => v.name === "Shares")?.value;
    expect(shares).toBe("A 38% · B 30% · C 32%");
  });

  it("a key exactly on a node position has no walk to draw", () => {
    // Key 3 hashes to 22, where C sits.
    const g = frames("ring", { keys: ["3"], events: [] });
    expect((g[0]?.model as CircleModel).walk).toBeNull();
    expect((g[0]?.model as CircleModel).points[0]?.hue).toBe(2);
  });
});

describe("Directory table", () => {
  const f = frames("directory");

  it("rows are key → node in assignment order: 12 A, 18 B, 29 C, 61 A, …", () => {
    const m = f[7]?.model as TableModel;
    const slots = m.lists[0]?.slots ?? [];
    expect(slots.map((s) => [s.index, s.label])).toEqual([
      ["12", "A"],
      ["18", "B"],
      ["29", "C"],
      ["61", "A"],
      ["65", "B"],
      ["66", "C"],
      ["79", "A"],
      ["97", "B"],
    ]);
    expect(m.badges?.map((b) => [b.label, b.value])).toEqual([
      ["A", "3"],
      ["B", "3"],
      ["C", "2"],
    ]);
  });

  it("keeps the table's height from the first step by padding empty rows", () => {
    expect((f[0]?.model as TableModel).lists[0]?.slots).toHaveLength(8);
  });

  it("the event step queues the rows the balancer will change: 79 and 97 → D", () => {
    const slots = (f[8]?.model as TableModel).lists[0]?.slots ?? [];
    expect(slots.filter((s) => s.tone === "warn").map((s) => [s.index, s.note])).toEqual([
      ["79", "→ D"],
      ["97", "→ D"],
    ]);
    expect(text(f[8] as never)).toBe("Add D: the balancer moves 79, 97 so loads even out.");
  });

  it("each row is rewritten on its own re-check, ringed and no longer queued", () => {
    const slots = (f[15]?.model as TableModel).lists[0]?.slots ?? [];
    const row79 = slots.find((s) => s.index === "79");
    expect(row79).toMatchObject({ label: "D", changed: true, tone: "focus" });
    expect(slots.find((s) => s.index === "97")).toMatchObject({
      label: "B",
      tone: "warn",
      note: "→ D",
    });
    expect(text(f[15] as never)).toBe("79 moves A → D");
  });

  it("the hot key stays and lighter keys move", () => {
    const g = frames("directory", { keys: ["12", "18", "29", "61*", "65", "66", "79", "97"] });
    const last = g[g.length - 1]?.model as TableModel;
    const owner = (k: string) => last.lists[0]?.slots.find((s) => s.index.startsWith(k))?.label;
    expect(owner("61")).toBe("A");
    expect(owner("12")).toBe("D");
    expect(owner("79")).toBe("D");
  });
});

describe("Rendezvous score table", () => {
  const f = frames("rendezvous");
  const rows = (i: number) => (f[i]?.model as TableModel).lists[0]?.slots ?? [];

  it("key 12 scores A 72, B 89, C 6 and B wins", () => {
    expect(
      rows(0)
        .filter((s) => s.state === "filled")
        .map((s) => [s.index, s.label]),
    ).toEqual([
      ["A", "72"],
      ["B", "89"],
      ["C", "6"],
    ]);
    expect(rows(0).find((s) => s.tone === "focus")).toMatchObject({ index: "B", note: "wins" });
    expect((f[0]?.model as TableModel).lists[0]?.title).toBe("Scores for 12");
    expect(f[0]?.vars.find((v) => v.name === "Winner")?.value).toBe("B 89");
    expect(f[0]?.vars.find((v) => v.name === "Runner-up")?.value).toBe("A 72");
  });

  it("pads to the run's widest node count so the height never changes", () => {
    expect(rows(0)).toHaveLength(4);
    expect(rows(0)[3]?.state).toBe("empty");
  });

  it("the event step lists the new node without scores", () => {
    expect(rows(8).find((s) => s.index === "D")).toMatchObject({ label: "–", note: "new" });
  });

  it("scores again on the re-check and names the old winner when the key moves", () => {
    // Key 29 re-checked under four nodes: D wins it from A.
    expect(f[11]).toMatchObject({ outcome: "bad", badge: "Moves" });
    expect(text(f[11] as never)).toContain("D wins · was A");
  });

  it("after Remove B the leaving node's row is a hatched marker", () => {
    const g = frames("rendezvous", { events: ["-B"] });
    const slots = (g[8]?.model as TableModel).lists[0]?.slots ?? [];
    expect(slots.find((s) => s.index === "B")?.state).toBe("marked");
  });
});

describe("every variant", () => {
  const ids: SchemeId[] = ["mod-n", "range", "ring", "directory", "rendezvous"];

  it("no two adjacent frames are identical", () => {
    for (const id of ids) {
      const f = frames(id);
      for (let i = 1; i < f.length; i++) {
        const a = JSON.stringify([f[i - 1]?.model, f[i - 1]?.vars, f[i - 1]?.caption]);
        const b = JSON.stringify([f[i]?.model, f[i]?.vars, f[i]?.caption]);
        expect(b, `${id} step ${i + 1}`).not.toBe(a);
      }
    }
  });

  it("place and event steps are neutral; a re-check is good or bad", () => {
    for (const id of ids) {
      const f = frames(id);
      expect(f.slice(0, 9).every((x) => x.outcome === "neutral")).toBe(true);
      expect(f.slice(9).every((x) => x.outcome === "good" || x.outcome === "bad")).toBe(true);
    }
  });

  it("the corner metric is a dash until the first event", () => {
    for (const id of ids) {
      const f = frames(id);
      expect(f[0]?.metric).toBe("—");
      expect(f[8]?.metric).toBe("0/8");
    }
  });

  it("every frame has the same variable rows in the same order within a variant", () => {
    for (const id of ids) {
      const f = frames(id);
      const names = f[0]?.vars.map((v) => v.name);
      expect(
        f.every((x) => JSON.stringify(x.vars.map((v) => v.name)) === JSON.stringify(names)),
      ).toBe(true);
    }
  });
});
