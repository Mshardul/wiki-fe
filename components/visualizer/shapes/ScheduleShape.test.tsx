import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { scheduleLayout } from "@/lib/visualizer/core/geometry";
import type { ScheduleModel } from "@/lib/visualizer/core/shapes";
import { ScheduleShape } from "./ScheduleShape";

const model = (now: number): ScheduleModel => ({
  kind: "schedule",
  track: "t",
  end: 20,
  now,
  tickEvery: 2,
  marksEvery: null,
  share: null,
  note: null,
  unit: "u",
  axisLabel: "",
  summary: { label: "Owner", segments: [{ from: 0, to: 10, style: "solid", label: "A" }] },
  rows: [
    {
      id: "a",
      label: "Row A",
      segments: [
        { from: 0, to: 10, style: "solid", label: "work" },
        { from: 10, to: 20, style: "hatch" },
      ],
    },
    { id: "b", label: "Row B", segments: [{ from: 6, to: 20, style: "outline", label: "io" }] },
  ],
  meters: [{ row: "b", from: 0, to: 25, label: "a long countdown" }],
  arrows: [{ at: 5, from: "b", to: "a", label: "ask" }],
  pins: [
    { at: 2, row: "a", label: "here" },
    { at: 2, row: "nope", label: "ghost" },
  ],
  values: {
    label: "count",
    points: [
      { at: 0, text: "1" },
      { at: 12, text: "9", bad: true },
    ],
  },
});

const L = scheduleLayout(model(0));
const num = (el: Element | null, attr: string) => Number(el?.getAttribute(attr));

describe("ScheduleShape", () => {
  it("draws only what has happened by now", () => {
    const { container } = render(<ScheduleShape model={model(4)} subject="Rows" />);
    const segs = container.querySelectorAll(".viz-sched__row .viz-sched__seg");
    expect(segs).toHaveLength(1);
    expect(num(segs[0] ?? null, "width")).toBeCloseTo(L.x(4) - L.x(0));
    expect(container.querySelector(".viz-sched__arrow")).toBeNull();
    expect(screen.queryByText("9")).toBeNull();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("adds arrows, labels and later values as the clock passes them", () => {
    const { container } = render(<ScheduleShape model={model(12)} subject="Rows" />);
    expect(container.querySelector(".viz-sched__arrow")).toBeTruthy();
    expect(screen.queryByText("ask")).toBeNull();
    expect(screen.getByText("work")).toBeTruthy();
    expect(container.querySelector(".viz-sched__value.is-bad")).toBeTruthy();
    expect(container.querySelectorAll(".viz-sched__row .viz-sched__seg")).toHaveLength(3);
  });

  it("labels a running segment once the drawn part fits the label", () => {
    render(<ScheduleShape model={model(4)} subject="Rows" />);
    expect(screen.getByText("work")).toBeTruthy();
    const { unmount } = render(<ScheduleShape model={model(0.2)} subject="Rows" />);
    expect(screen.getAllByText("work")).toHaveLength(2);
    unmount();
  });

  it("fills a meter up to now over its clamped track", () => {
    const { container } = render(<ScheduleShape model={model(5)} subject="Rows" />);
    const track = container.querySelector(".viz-sched__meter-track");
    const fill = container.querySelector(".viz-sched__meter-fill");
    expect(num(track, "width")).toBeCloseTo(L.right - L.x(0));
    expect(num(fill, "width")).toBeCloseTo(L.x(5) - L.x(0));
  });

  it("draws an arrow without repeating the legend's name", () => {
    const { container } = render(<ScheduleShape model={model(15)} subject="Rows" />);
    expect(container.querySelector(".viz-sched__arrow")).toBeTruthy();
    expect(screen.queryByText("ask")).toBeNull();
  });

  it("skips anything on a row that does not exist", () => {
    render(<ScheduleShape model={model(5)} subject="Rows" />);
    expect(screen.getByText("here")).toBeTruthy();
    expect(screen.queryByText("ghost")).toBeNull();
  });

  it("keeps the playhead on the plot at the end", () => {
    const { container } = render(<ScheduleShape model={model(25)} subject="Rows" />);
    expect(num(container.querySelector(".viz-sched__now"), "x1")).toBe(L.right);
  });

  it("shows the axis caption and the numbers when there is no unit", () => {
    render(
      <ScheduleShape model={{ ...model(1), unit: null, axisLabel: "steps →" }} subject="Rows" />,
    );
    expect(screen.getByText("steps →")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.queryByText("0 u")).toBeNull();
  });

  it("reads out each row's solid time and the idle rest", () => {
    const { container } = render(
      <ScheduleShape
        model={{ ...model(12), share: { lead: "Held at", idle: "free" } }}
        subject="Rows"
      />,
    );
    expect(container.querySelector(".viz-sched__share")?.textContent).toBe(
      "Held at 12.0 u:Row A 10.0 u (83%)Row B 0.0 u (0%)free 2.0 u",
    );
  });

  it("shows the note when there is no share readout", () => {
    render(<ScheduleShape model={{ ...model(1), note: "Read me" }} subject="Rows" />);
    expect(screen.getByText("Read me")).toBeTruthy();
  });

  it("marks solid segments at the given spacing, up to now", () => {
    const { container } = render(
      <ScheduleShape model={{ ...model(5), marksEvery: 2 }} subject="Rows" />,
    );
    const xs = [...container.querySelectorAll(".viz-sched__mark")].map((m) => num(m, "x1"));
    expect(xs).toEqual([L.x(2), L.x(4)]);
  });

  it("glides the playhead to the next step on the same track", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    const { container, rerender } = render(<ScheduleShape model={model(4)} subject="Rows" />);
    const playhead = () => num(container.querySelector(".viz-sched__now"), "x1");
    rerender(<ScheduleShape model={model(12)} subject="Rows" />);
    expect(playhead()).toBeCloseTo(L.x(4));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(playhead()).toBeCloseTo(L.x(12));
    vi.useRealTimers();
  });

  it("describes what has happened for assistive tech", () => {
    render(<ScheduleShape model={model(4)} subject="Rows" />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Rows at 4u: Row A: work 0–4; Row B: nothing yet",
    );
  });
});
