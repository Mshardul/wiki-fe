import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  modelKeys,
  type TableList,
  type TableModel,
  type TableSlot,
} from "@/lib/visualizer/core/shapes";
import {
  TABLE_CHIP_W,
  TABLE_INDEX_W,
  TABLE_LANE_W,
  TABLE_LIST_GAP,
  TABLE_METER_H,
  TABLE_NODE_W,
  TABLE_SLOT_H,
  TABLE_SLOT_W,
  TableShape,
} from "./TableShape";

const slot = (i: number, o: Partial<TableSlot> = {}): TableSlot => ({
  index: String(i),
  state: "empty",
  tone: "plain",
  nodes: [],
  ...o,
});
const filled = (i: number, label: string, o: Partial<TableSlot> = {}): TableSlot =>
  slot(i, { state: "filled", label, ...o });
const list = (o: Partial<TableList> = {}): TableList => ({
  slots: [filled(0, "16"), slot(1), filled(2, "24")],
  hops: [],
  runs: [],
  room: 0,
  lane: true,
  chip: null,
  ...o,
});
const model = (o: Partial<TableModel> = {}): TableModel => ({
  kind: "table",
  lists: [list()],
  meter: null,
  ...o,
});
const all = (c: HTMLElement, sel: string) => [...c.querySelectorAll(sel)];

describe("TableShape", () => {
  it("draws one row per slot with its index and label", () => {
    const { container } = render(<TableShape model={model()} subject="Table" />);
    expect(all(container, ".viz-table__slot")).toHaveLength(3);
    expect(all(container, ".viz-table__index").map((e) => e.textContent)).toEqual(["0", "1", "2"]);
    expect(all(container, ".viz-table__label").map((e) => e.textContent)).toEqual(["16", "24"]);
  });

  it("empty slots are dashed and marked slots show a cross", () => {
    const m = model({ lists: [list({ slots: [slot(0), slot(1, { state: "marked" })] })] });
    const { container } = render(<TableShape model={m} subject="Table" />);
    expect(container.querySelector(".viz-table__slot--empty")).not.toBeNull();
    expect(container.querySelector(".viz-table__slot--marked .viz-table__cross")?.textContent).toBe(
      "×",
    );
  });

  it("tone is a class on the slot and focus is the ring", () => {
    const m = model({
      lists: [
        list({
          slots: [filled(0, "1", { tone: "focus" }), filled(1, "2", { tone: "good" })],
        }),
      ],
    });
    const { container } = render(<TableShape model={m} subject="Table" />);
    expect(container.querySelector(".viz-table__slot--focus")).not.toBeNull();
    expect(container.querySelector(".viz-table__slot--good")).not.toBeNull();
  });

  it("items hang right of their slot in order and outlined ones get the outline class", () => {
    const m = model({
      lists: [
        list({
          room: 3,
          lane: false,
          slots: [
            filled(0, "16", {
              nodes: [
                { label: "8", tone: "plain", outlined: true },
                { label: "24", tone: "focus" },
              ],
            }),
          ],
        }),
      ],
    });
    const { container } = render(<TableShape model={m} subject="Table" />);
    const nodes = all(container, ".viz-table__node");
    expect(nodes.map((n) => n.textContent)).toEqual(["8", "24"]);
    expect(nodes[0]?.classList.contains("viz-table__node--outlined")).toBe(true);
    expect(nodes[1]?.classList.contains("viz-table__node--outlined")).toBe(false);
  });

  it("draws one arc per hop with its label, and the current arc is marked", () => {
    const m = model({
      lists: [
        list({
          hops: [
            { from: 0, to: 1, label: "+1" },
            { from: 0, to: 2, label: "+4", current: true },
          ],
        }),
      ],
    });
    const { container } = render(<TableShape model={m} subject="Table" />);
    expect(all(container, ".viz-table__hop").map((e) => e.textContent)).toEqual(["+1", "+4"]);
    expect(all(container, ".viz-table__hop--current")).toHaveLength(1);
  });

  it("a hop that wraps from the last slot to the first still draws", () => {
    const m = model({ lists: [list({ hops: [{ from: 2, to: 0, label: "+9" }] })] });
    const { container } = render(<TableShape model={m} subject="Table" />);
    const d = container.querySelector(".viz-table__hop path")?.getAttribute("d") ?? "";
    expect(d).toMatch(/^M [\d.]+ [\d.]+ Q [\d.]+ [\d.]+ [\d.]+ [\d.]+$/);
  });

  it("runs draw one dashed outline per run", () => {
    const m = model({ lists: [list({ runs: [{ from: 0, to: 2 }] })] });
    const { container } = render(<TableShape model={m} subject="Table" />);
    expect(all(container, ".viz-table__run")).toHaveLength(1);
  });

  it("the chip draws its key and lines and a dashed line to its slot, and none when to is null", () => {
    const chip = { label: "32", lines: ["32 mod 8 = 0"], to: 0 };
    const a = render(<TableShape model={model({ lists: [list({ chip })] })} subject="Table" />);
    expect(a.container.querySelector(".viz-table__chip-key")?.textContent).toBe("32");
    expect(a.container.querySelector(".viz-table__chip-line")?.textContent).toBe("32 mod 8 = 0");
    expect(a.container.querySelector(".viz-table__pointer")).not.toBeNull();
    const b = render(
      <TableShape model={model({ lists: [list({ chip: { ...chip, to: null } })] })} subject="T" />,
    );
    expect(b.container.querySelector(".viz-table__pointer")).toBeNull();
  });

  it("two lists draw side by side and the faded one is marked", () => {
    const m = model({
      lists: [list({ faded: true }), list({ slots: [slot(0), slot(1), slot(2), slot(3)] })],
    });
    const { container } = render(<TableShape model={m} subject="Table" />);
    expect(all(container, ".viz-table__list")).toHaveLength(2);
    expect(all(container, ".viz-table__list--faded")).toHaveLength(1);
  });

  it("the meter fill is value over max and the tick sits at the mark", () => {
    const m = model({ meter: { label: "load", value: 1, max: 2, mark: 1.5, markLabel: "0.75" } });
    const { container } = render(<TableShape model={m} subject="Table" />);
    const track = container.querySelector(".viz-table__meter-track");
    const trackW = Number(track?.getAttribute("width"));
    const fill = Number(container.querySelector(".viz-table__meter-fill")?.getAttribute("width"));
    expect(fill).toBeCloseTo(trackW / 2);
    const tick = Number(container.querySelector(".viz-table__meter-mark line")?.getAttribute("x1"));
    expect(tick).toBeCloseTo(Number(track?.getAttribute("x")) + trackW * 0.75);
    expect(container.querySelector(".viz-table__meter-mark text")?.textContent).toBe("0.75");
    const none = render(
      <TableShape
        model={model({ meter: { label: "load", value: 1, max: 2, mark: null } })}
        subject="T"
      />,
    );
    expect(none.container.querySelector(".viz-table__meter-mark")).toBeNull();
  });

  it("slot positions depend on room and lane only, not on the chip or arcs", () => {
    const at = (c: HTMLElement) =>
      all(c, ".viz-table__cell").map((e) => `${e.getAttribute("x")},${e.getAttribute("y")}`);
    const plain = render(<TableShape model={model()} subject="Table" />);
    const busy = render(
      <TableShape
        model={model({
          lists: [
            list({
              hops: [{ from: 0, to: 2, label: "+2" }],
              chip: { label: "1", lines: ["a", "b"], to: 1 },
            }),
          ],
        })}
        subject="Table"
      />,
    );
    expect(at(busy.container)).toEqual(at(plain.container));
  });

  it("scales inside a fit box and labels itself with the slot labels", () => {
    const { container } = render(<TableShape model={model()} subject="Hash table" />);
    expect(container.querySelector(".viz-fit")).not.toBeNull();
    expect(container.querySelector("[role=img]")?.getAttribute("aria-label")).toBe(
      "Hash table: 16, 24",
    );
    expect(modelKeys(model())).toEqual(["16", "24"]);
  });

  it("natural sizes match the css tokens", () => {
    const css = readFileSync("css/tokens.css", "utf8");
    const px = (name: string) => Number(new RegExp(`--viz-table-${name}: (\\d+)px`).exec(css)?.[1]);
    expect(px("slot-w")).toBe(TABLE_SLOT_W);
    expect(px("slot-h")).toBe(TABLE_SLOT_H);
    expect(px("index-w")).toBe(TABLE_INDEX_W);
    expect(px("node-w")).toBe(TABLE_NODE_W);
    expect(px("lane-w")).toBe(TABLE_LANE_W);
    expect(px("chip-w")).toBe(TABLE_CHIP_W);
    expect(px("list-gap")).toBe(TABLE_LIST_GAP);
    expect(px("meter-h")).toBe(TABLE_METER_H);
  });
});

describe("TableShape owner colours and badges", () => {
  it("gives a row its owner's hue and a white ring when it changed", () => {
    const m = model({
      lists: [
        list({
          slots: [filled(12, "A", { hue: 0 }), filled(18, "D", { hue: 3, changed: true })],
        }),
      ],
    });
    const { container } = render(<TableShape model={m} subject="Directory" />);
    const slots = all(container, ".viz-table__slot");
    expect(slots[0]?.classList.contains("viz-hue-0")).toBe(true);
    expect(slots[1]?.classList.contains("viz-hue-3")).toBe(true);
    expect(slots[0]?.classList.contains("viz-table__slot--changed")).toBe(false);
    expect(slots[1]?.classList.contains("viz-table__slot--changed")).toBe(true);
  });

  it("leaves a row without a hue on the plain colours", () => {
    const { container } = render(<TableShape model={model()} subject="Table" />);
    expect(container.querySelector(".viz-table__slot--hue")).toBeNull();
  });

  it("draws a badge per owner under the table", () => {
    const m = model({
      badges: [
        { label: "A", value: "3", hue: 0 },
        { label: "B", value: "1", hue: 1 },
      ],
    });
    const { container } = render(<TableShape model={m} subject="Directory" />);
    const badges = all(container, ".viz-table__badge");
    expect(badges.map((b) => b.textContent)).toEqual(["A 3", "B 1"]);
  });

  it("makes the figure wide enough for six badges", () => {
    const badges = Array.from({ length: 6 }, (_, i) => ({ label: "A", value: "1", hue: i }));
    const { container } = render(<TableShape model={model({ badges })} subject="Directory" />);
    const svg = container.querySelector("svg");
    const widest = Math.max(
      ...all(container, ".viz-table__badge").map((b) => {
        const [x] = (b.getAttribute("transform") ?? "").match(/[\d.]+/g) ?? ["0"];
        return Number(x) + 44;
      }),
    );
    expect(Number(svg?.getAttribute("width"))).toBeGreaterThanOrEqual(widest);
  });
});

describe("TableShape compact lists", () => {
  it("starts a compact list at its index column, so it is narrower than one with a held-item column", () => {
    const wide = render(<TableShape model={model()} subject="Table" />);
    const narrow = render(
      <TableShape model={model({ lists: [list({ compact: true })] })} subject="Table" />,
    );
    const w = (c: HTMLElement) => Number(c.querySelector("svg")?.getAttribute("width"));
    expect(w(narrow.container)).toBeLessThan(w(wide.container));
  });

  it("widens a compact list for a title longer than its body", () => {
    const long = render(
      <TableShape
        model={model({ lists: [list({ compact: true, title: "Scores for 29 here" })] })}
        subject="Table"
      />,
    );
    const short = render(
      <TableShape
        model={model({ lists: [list({ compact: true, title: "S" })] })}
        subject="Table"
      />,
    );
    const w = (c: HTMLElement) => Number(c.querySelector("svg")?.getAttribute("width"));
    expect(w(long.container)).toBeGreaterThan(w(short.container));
  });
});
