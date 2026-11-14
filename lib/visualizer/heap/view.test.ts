import { describe, expect, it } from "vitest";
import { buildRun, extractRun, type HeapItem, heapsortRun, insertRun } from "./engine";
import { heapModelOf, mathsVarsOf } from "./view";

const items = (...v: number[]): HeapItem[] => v.map((value) => ({ value }));

describe("heap view", () => {
  it("tree node k and array bar k carry the same tone in every build event", () => {
    const data = items(5, 4, 3, 2, 1);
    for (const ev of buildRun(data, "min")) {
      const tree = heapModelOf(ev, 5, 5);
      const bars = tree.array.rows[0]?.bars ?? [];
      tree.nodes.forEach((node, k) => expect(node?.tone).toBe(bars[k]?.tone));
    }
  });

  it("level zones cover 0..size-1 exactly", () => {
    const ev = insertRun(items(5, 3, 8, 1, 4, 7), "min").at(-2);
    if (!ev) throw new Error("no event");
    const zones = (heapModelOf(ev, 6, 8).array.rows[0]?.zones ?? []).filter((z) =>
      z.label.startsWith("L"),
    );
    const covered = zones.flatMap((z) =>
      Array.from({ length: z.to - z.from + 1 }, (_, k) => z.from + k),
    );
    expect(covered).toEqual(Array.from({ length: ev.size }, (_, k) => k));
  });

  it("the array row is padded to capacity so it never changes width", () => {
    for (const ev of insertRun(items(3, 1, 2), "min")) {
      expect(heapModelOf(ev, 3, 3).array.rows[0]?.bars).toHaveLength(3);
    }
  });

  it("heap sort's last event has an empty tree and an all-green array with a sorted zone", () => {
    const ev = heapsortRun(items(2, 1, 3), "max").at(-1);
    if (!ev) throw new Error("no event");
    const tree = heapModelOf(ev, 3, 3);
    expect(tree.nodes).toEqual([]);
    expect((tree.array.rows[0]?.bars ?? []).every((b) => b?.tone === "good")).toBe(true);
    expect(tree.array.rows[0]?.zones.some((z) => z.label === "sorted")).toBe(true);
  });

  it("maths shows the parent line while sifting up and the child line while sifting down", () => {
    const up = insertRun(items(3, 1, 2), "min").find((e) => e.badge === "Compare");
    const down = buildRun(items(5, 4, 3, 2, 1), "min").find((e) => e.badge === "Pick child");
    if (!up || !down) throw new Error("missing events");
    expect(mathsVarsOf(up)).toEqual([{ name: "maths", value: "parent of 1 = ⌊(1 − 1) / 2⌋ = 0" }]);
    expect(mathsVarsOf(down)).toEqual([
      { name: "maths", value: "children of 1 = 2·1+1 = 3 and 2·1+2 = 4" },
    ]);
  });

  it("take root empties slot 0 in both models and keeps a ghost", () => {
    const ev = extractRun(items(1, 2, 3), "min")[1];
    if (!ev) throw new Error("no event");
    const tree = heapModelOf(ev, 3, 3);
    expect(tree.nodes[0]).toBeNull();
    expect(tree.leaving).toMatchObject({ value: 1 });
    expect(tree.array.rows[0]?.bars[0]).toBeNull();
    expect(tree.array.rows[1]?.label).toBe("taken out");
  });
});
