import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fitScale } from "@/lib/visualizer/core/fit";
import { flowCardsLayout, wrapNote } from "@/lib/visualizer/core/flow-cards-layout";
import type { FlowCardsModel } from "@/lib/visualizer/core/shapes";
import { FlowCardsShape } from "./FlowCardsShape";

const model = (o: Partial<FlowCardsModel> = {}): FlowCardsModel => ({
  kind: "flow-cards",
  hub: "load balancer",
  intake: { label: "r7", note: "8 ticks", caption: "next request" },
  slots: 3,
  routeTo: "S1",
  moves: [],
  cards: [
    {
      id: "S1",
      label: "S1",
      hue: 0,
      count: "2",
      countLabel: "connections",
      chips: [
        { id: "r1", label: "r1", left: 3, total: 9, heavy: true },
        { id: "r7", label: "r7", left: 8, total: 8, ghost: true },
      ],
    },
    { id: "S2", label: "S2", hue: 1, count: "0", countLabel: "connections", chips: [] },
    {
      id: "S3",
      label: "S3",
      hue: 2,
      count: "1",
      countLabel: "connection",
      chips: [{ id: "r6", label: "r6", left: 1, total: 2 }],
    },
  ],
  panel: {
    title: "whose turn",
    body: {
      kind: "tokens",
      items: [
        { label: "S1", on: true },
        { label: "S2", on: false },
        { label: "S3", on: false },
      ],
    },
    headline: { label: "picks by", value: "turn only", note: "Load is not looked at." },
  },
  ...o,
});

describe("FlowCardsShape", () => {
  it("draws the intake, the hub and one card per server with its count", () => {
    const { container } = render(<FlowCardsShape model={model()} subject="Servers" />);
    expect(container.querySelector(".viz-flow__intake-id")?.textContent).toBe("r7");
    expect(
      [...container.querySelectorAll(".viz-flow__hub tspan")].map((t) => t.textContent),
    ).toEqual(["load", "balancer"]);
    expect(container.querySelectorAll(".viz-flow__card")).toHaveLength(3);
    expect([...container.querySelectorAll(".viz-flow__count")].map((t) => t.textContent)).toEqual([
      "2",
      "0",
      "1",
    ]);
  });

  it("gives every card its hue and highlights the routed one", () => {
    const { container } = render(<FlowCardsShape model={model()} subject="Servers" />);
    const cards = container.querySelectorAll(".viz-flow__card");
    expect(cards[1]?.classList.contains("viz-hue-1")).toBe(true);
    expect(cards[0]?.classList.contains("viz-flow__card--picked")).toBe(true);
    expect(container.querySelectorAll(".viz-flow__route--on")).toHaveLength(1);
  });

  it("draws a chip's time left as a bar share and flags long and arriving ones", () => {
    const { container } = render(<FlowCardsShape model={model()} subject="Servers" />);
    const chips = container.querySelectorAll(".viz-flow__chip");
    expect(chips).toHaveLength(3);
    const r1 = [...chips].find((c) => c.textContent?.startsWith("r1"));
    expect(r1?.classList.contains("viz-flow__chip--heavy")).toBe(true);
    expect(r1?.textContent).toContain("3 / 9");
    const fill = r1?.querySelector<SVGRectElement>(".viz-flow__fill");
    const track = r1?.querySelector<SVGRectElement>(".viz-flow__track");
    expect(Number.parseFloat(fill?.style.width ?? "0")).toBeCloseTo(
      Number(track?.getAttribute("width")) / 3,
    );
    const ghost = container.querySelector(".viz-flow__chip--ghost");
    expect(ghost?.textContent).toContain("r7");
    expect(ghost?.textContent).toContain("8");
    expect(ghost?.textContent).not.toContain("/");
  });

  it("says idle for an empty card, and hatches a failed one without a second label", () => {
    const m = model();
    (m.cards[2] as { down?: boolean }).down = true;
    (m.cards[2] as { chips: unknown[] }).chips = [];
    const { container } = render(<FlowCardsShape model={m} subject="Servers" />);
    const idle = [...container.querySelectorAll(".viz-flow__idle")].map((t) => t.textContent);
    expect(idle).toEqual(["idle"]);
    expect(container.querySelectorAll(".viz-flow__count-label")[2]?.textContent).toBe("connection");
    expect(container.querySelectorAll(".viz-flow__card--down")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-flow__card-hatch")).toHaveLength(1);
  });

  it("draws a dotted move arrow for a re-route and drops the intake", () => {
    const { container } = render(
      <FlowCardsShape
        model={model({ intake: null, moves: [{ from: "S1", to: "S2" }] })}
        subject="Servers"
      />,
    );
    expect(container.querySelectorAll(".viz-flow__move")).toHaveLength(1);
    expect(container.querySelector(".viz-flow__intake")).toBeNull();
  });

  it("moves a chip between cards on the same element, not a new one", () => {
    const { container, rerender } = render(<FlowCardsShape model={model()} subject="Servers" />);
    const before = [...container.querySelectorAll(".viz-flow__chip")].find((c) =>
      c.textContent?.startsWith("r6"),
    );
    const moved = model();
    const chip = moved.cards[2]?.chips.shift();
    if (chip) moved.cards[1]?.chips.push(chip);
    rerender(<FlowCardsShape model={moved} subject="Servers" />);
    const after = [...container.querySelectorAll(".viz-flow__chip")].find((c) =>
      c.textContent?.startsWith("r6"),
    );
    expect(after).toBe(before);
  });

  it.each([
    [
      "tokens",
      {
        kind: "tokens" as const,
        items: [
          { label: "S1", on: false },
          { label: "S2", on: true },
        ],
      },
      ".viz-flow__token--on",
    ],
    [
      "bars",
      {
        kind: "bars" as const,
        rows: [{ label: "S1", value: 1, of: 2, note: "1 of 2", mark: true }],
      },
      ".viz-flow__row--mark",
    ],
    ["lines", { kind: "lines" as const, lines: ["9 mod 3 = 0"] }, ".viz-flow__math"],
  ])("draws a %s panel", (_name, body, selector) => {
    const m = model();
    const { container } = render(
      <FlowCardsShape model={{ ...m, panel: { ...m.panel, body } }} subject="Servers" />,
    );
    expect(container.querySelector(selector)).toBeTruthy();
    expect(container.querySelector(".viz-flow__headline")?.textContent).toBe("turn only");
  });

  it("describes the servers for a screen reader", () => {
    const { getByRole } = render(<FlowCardsShape model={model()} subject="Servers" />);
    expect(getByRole("img").getAttribute("aria-label")).toBe(
      "Servers: S1: 2 connections; S2: 0 connections; S3: 1 connection",
    );
  });

  it("scales four cards with five chips down to fit a 320px stage", () => {
    const wide = model({ slots: 5 });
    const { width, height } = flowCardsLayout(wide);
    expect(fitScale({ width, height }, { width: 288, height: 300 })).toBeLessThan(1);
  });
});

describe("flowCardsLayout", () => {
  it("keeps one width for a run: it grows with the slots, not with the chips shown", () => {
    const few = flowCardsLayout(model({ slots: 3 }));
    const many = flowCardsLayout(model({ slots: 5 }));
    expect(many.width).toBeGreaterThan(few.width);
    expect(flowCardsLayout(model({ slots: 3 })).width).toBe(few.width);
  });

  it("puts chips in their card's row, left to right", () => {
    const layout = flowCardsLayout(model());
    const r1 = layout.chips.get("r1");
    const r7 = layout.chips.get("r7");
    expect(r1?.y).toBe(r7?.y);
    expect((r7?.x ?? 0) > (r1?.x ?? 0)).toBe(true);
    expect((layout.chips.get("r6")?.y ?? 0) > (r1?.y ?? 0)).toBe(true);
  });

  it("wraps a note at spaces", () => {
    expect(wrapNote("S3 has the fewest, so r7 goes there.", 20)).toEqual([
      "S3 has the fewest,",
      "so r7 goes there.",
    ]);
    expect(wrapNote("", 20)).toEqual([]);
  });
});
