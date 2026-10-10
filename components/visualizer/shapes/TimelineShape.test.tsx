import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TimelineModel } from "@/lib/visualizer/core/shapes";
import { TimelineShape } from "./TimelineShape";

const base: TimelineModel = {
  kind: "timeline",
  ticks: 12,
  now: 7,
  stack: 2,
  lanes: 2,
  rows: [
    {
      label: "",
      marks: [
        { at: 4, tone: "good", title: "allowed" },
        { at: 5, tone: "good", title: "allowed" },
        { at: 7, tone: "bad", title: "rejected", current: true },
        { at: 2, tone: "faded", title: "aged out" },
      ],
    },
  ],
  bands: [
    { from: 0, to: 5, label: "window 0 · 3/3 full", short: "3/3" },
    { from: 6, to: 11, label: "window 1 · 1/3", short: "1/3" },
  ],
  spans: [
    { from: 4, to: 7, label: "6 allowed in 4 ticks", short: "6 in 4", style: "alert" },
    { from: 2, to: 7, label: "last 6 ticks", short: "last 6", style: "outline" },
    { from: 2, to: 4, label: "", style: "hatch" },
  ],
  boundaries: [6],
};

const FULL = { w: 800, h: 500 };

describe("TimelineShape", () => {
  it("names the marks in order for screen readers", () => {
    render(<TimelineShape model={base} size={FULL} subject="Limiter" />);
    expect(
      screen.getByRole("img", {
        name: "Limiter: tick 4 allowed, tick 5 allowed, tick 7 rejected, tick 2 aged out",
      }),
    ).toBeTruthy();
  });

  it("draws rejected marks hollow with a cross and ring the current one", () => {
    const { container } = render(<TimelineShape model={base} size={FULL} subject="Limiter" />);
    expect(container.querySelectorAll(".viz-tl__mark--good")).toHaveLength(2);
    expect(container.querySelectorAll(".viz-tl__mark--bad .viz-tl__cross")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-tl__mark--faded")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-tl__ring")).toHaveLength(1);
  });

  it("shows full band and span labels on a roomy stage and short ones on a narrow one", () => {
    const { rerender } = render(<TimelineShape model={base} size={FULL} subject="Limiter" />);
    expect(screen.getByText("window 0 · 3/3 full")).toBeTruthy();
    expect(screen.getByText("6 allowed in 4 ticks")).toBeTruthy();
    rerender(<TimelineShape model={base} size={{ w: 250, h: 200 }} subject="Limiter" />);
    expect(screen.queryByText("window 0 · 3/3 full")).toBeNull();
    expect(screen.getByText("3/3")).toBeTruthy();
    expect(screen.getByText("6 in 4")).toBeTruthy();
  });

  it("draws one line per boundary and one pattern for hatched spans", () => {
    const { container } = render(<TimelineShape model={base} size={FULL} subject="Limiter" />);
    expect(container.querySelectorAll(".viz-tl__boundary")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-tl__span--hatch")).toHaveLength(1);
  });

  it("collapses a tall pile of simultaneous marks into a +n chip", () => {
    const pile: TimelineModel = {
      ...base,
      stack: 4,
      spans: [],
      bands: [],
      boundaries: [],
      rows: [
        {
          label: "",
          marks: Array.from({ length: 7 }, (_, i) => ({
            at: 3,
            tone: i < 5 ? ("good" as const) : ("bad" as const),
            ...(i === 6 ? { current: true } : {}),
          })),
        },
      ],
    };
    const { container } = render(<TimelineShape model={pile} size={FULL} subject="Limiter" />);
    expect(container.querySelectorAll(".viz-tl__mark")).toHaveLength(3);
    const chip = container.querySelector(".viz-tl__more");
    expect(chip?.textContent).toBe("+4");
    expect(chip?.classList.contains("is-current")).toBe(true);
  });

  it("scrolls horizontally when even thin labels cannot fit", () => {
    const wide: TimelineModel = { ...base, ticks: 20 };
    const { container } = render(
      <TimelineShape model={wide} size={{ w: 250, h: 200 }} subject="Limiter" />,
    );
    const inner = container.querySelector<HTMLElement>(".viz-tl__inner");
    expect(Number.parseFloat(inner?.style.width ?? "0")).toBeGreaterThan(250);
  });

  it("labels each row when rows are named", () => {
    const two: TimelineModel = {
      ...base,
      spans: [],
      rows: [
        { label: "arrive", marks: [{ at: 1, tone: "good" }] },
        { label: "leave", marks: [{ at: 3, tone: "faded" }] },
      ],
    };
    render(<TimelineShape model={two} size={FULL} subject="Limiter" />);
    expect(screen.getByText("arrive")).toBeTruthy();
    expect(screen.getByText("leave")).toBeTruthy();
  });
});
