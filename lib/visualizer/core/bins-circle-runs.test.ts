import { describe, expect, it } from "vitest";
import { BIN_CELL_H, BIN_GAP, BIN_HEAD_H, BIN_W, binsLayout, tallestStack } from "./bins-layout";
import { angleOf, arcPath, circularGap, clockwiseGap, layerPoints, polar } from "./circle-geometry";
import { RUN_CELL_W, RUN_GAP, RUN_PAD, runsLayout } from "./runs-layout";
import type { BinsModel, RunsModel } from "./shapes";

const bins = (): BinsModel => ({
  kind: "bins",
  slots: 4,
  active: null,
  bins: [
    {
      id: "A",
      label: "A",
      hue: 0,
      count: "2",
      items: [
        { id: "k1", label: "12" },
        { id: "k2", label: "61 ×5", heavy: true },
      ],
    },
    { id: "B", label: "B", hue: 1, count: "0", items: [] },
  ],
});

describe("binsLayout", () => {
  it("stacks items from the bottom and counts a heavy item as two cells", () => {
    const l = binsLayout(bins());
    const bottom = BIN_HEAD_H + 4 * BIN_CELL_H;
    const first = l.items[0];
    const second = l.items[1];
    expect(first?.y).toBe(bottom - BIN_CELL_H + 2);
    expect(second?.y).toBe(bottom - 3 * BIN_CELL_H + 2);
    expect(second?.h).toBe(2 * BIN_CELL_H - 4);
  });

  it("keeps one height from the run-wide slot count, however full the bins are", () => {
    const empty: BinsModel = {
      ...bins(),
      bins: [{ id: "A", label: "A", hue: 0, count: "0", items: [] }],
    };
    expect(binsLayout(empty).height).toBe(binsLayout(bins()).height);
    expect(binsLayout(bins()).height).toBeGreaterThan(BIN_HEAD_H + 4 * BIN_CELL_H);
  });

  it("puts bins side by side and sizes the width from the count", () => {
    const l = binsLayout(bins());
    expect(l.binX[1]).toBe((l.binX[0] as number) + BIN_W + BIN_GAP);
  });

  it("measures the tallest stack with heavy items doubled", () => {
    expect(tallestStack(bins().bins)).toBe(3);
    expect(tallestStack([])).toBe(1);
  });

  it("moves an item to its new bin without changing its id", () => {
    const next = bins();
    const moved = next.bins[0]?.items.pop();
    if (moved) next.bins[1]?.items.push(moved);
    const a = binsLayout(bins()).items.find((i) => i.id === "k2");
    const b = binsLayout(next).items.find((i) => i.id === "k2");
    expect(b?.bin).toBe(1);
    expect(b?.x).toBeGreaterThan(a?.x ?? 0);
  });
});

describe("circle geometry", () => {
  it("puts position 0 at the top and runs clockwise", () => {
    const top = polar(100, 100, 50, 0, 100);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(50);
    const right = polar(100, 100, 50, 25, 100);
    expect(right.x).toBeCloseTo(150);
    expect(right.y).toBeCloseTo(100);
    expect(angleOf(0, 100)).toBeCloseTo(-Math.PI / 2);
  });

  it("puts position 99 just before the top", () => {
    const p = polar(100, 100, 50, 99, 100);
    expect(p.x).toBeLessThan(100);
    expect(p.x).toBeGreaterThan(95);
    expect(p.y).toBeLessThan(51);
  });

  it("measures the clockwise gap across the wrap", () => {
    expect(clockwiseGap(97, 3, 100)).toBe(6);
    expect(clockwiseGap(3, 97, 100)).toBe(94);
    expect(circularGap(3, 97, 100)).toBe(6);
  });

  it("takes the long way round for an arc over half the circle", () => {
    expect(arcPath(0, 0, 10, 0, 75, 100)).toContain("0 1 1");
    expect(arcPath(0, 0, 10, 0, 25, 100)).toContain("0 0 1");
  });

  it("moves a point near an earlier one out a layer and leaves far ones on the ring", () => {
    expect(layerPoints([16, 34, 53, 55, 68, 77], 100, 5)).toEqual([0, 0, 0, 1, 0, 0]);
  });

  it("treats the wrap as close: 98 and 1 crowd each other", () => {
    const layers = layerPoints([1, 98], 100, 5);
    expect(new Set(layers).size).toBe(2);
  });
});

const runs = (): RunsModel => ({
  kind: "runs",
  cells: [
    { id: "a", label: "12", hue: 0 },
    { id: "b", label: "18", hue: 0, heavy: true },
    { id: "c", label: "61", hue: 1 },
  ],
  braces: [
    { from: 0, to: 1, hue: 0, label: "A", detail: "0–32", note: "2" },
    { from: 2, to: 2, hue: 1, label: "B", detail: "33–65", note: "1" },
  ],
});

describe("runsLayout", () => {
  it("lays equal cells in a row and a heavy one double width", () => {
    const l = runsLayout(runs());
    expect(l.cells[0]?.w).toBe(RUN_CELL_W);
    expect(l.cells[1]?.w).toBe(2 * RUN_CELL_W + RUN_GAP);
    expect(l.cells[0]?.x).toBe(RUN_PAD);
  });

  it("spans a brace under the first to the last cell of its run", () => {
    const l = runsLayout(runs());
    const first = l.cells[0];
    const second = l.cells[1];
    expect(l.braces[0]?.x).toBe(first?.x);
    expect(l.braces[0]?.w).toBe((second?.x ?? 0) + (second?.w ?? 0) - (first?.x ?? 0));
  });

  it("reserves a placeholder for an empty range and shifts the cells after it", () => {
    const m = runs();
    m.braces.splice(1, 0, { from: 2, to: 1, hue: 2, label: "C", detail: "33–65", note: "0" });
    const l = runsLayout(m);
    expect(l.braces[1]?.w).toBe(RUN_CELL_W);
    expect(l.braces[1]?.x).toBeLessThan(l.cells[2]?.x ?? 0);
    expect(l.cells[2]?.x).toBeGreaterThan(runsLayout(runs()).cells[2]?.x ?? 0);
  });

  it("gives two empty ranges at the same spot their own placeholders, side by side", () => {
    const m = runs();
    m.braces.push(
      { from: 3, to: 2, hue: 2, label: "C", detail: "66–79", note: "0 keys" },
      { from: 3, to: 2, hue: 3, label: "D", detail: "80–99", note: "0 keys" },
    );
    const l = runsLayout(m);
    const [c, d] = [l.braces[2], l.braces[3]];
    expect(c?.x).not.toBe(d?.x);
    expect((d?.x ?? 0) - (c?.x ?? 0)).toBe(RUN_CELL_W + RUN_GAP);
    expect(c?.x).toBeGreaterThan((l.cells[2]?.x ?? 0) + (l.cells[2]?.w ?? 0) - 1);
  });

  it("handles a model with no cells", () => {
    const l = runsLayout({ kind: "runs", cells: [], braces: [] });
    expect(l.cells).toEqual([]);
    expect(l.width).toBeGreaterThan(0);
  });
});
