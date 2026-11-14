import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ArrayModel, ArrayRow } from "@/lib/visualizer/core/shapes";
import { ArrayShape } from "./ArrayShape";

const row = (over: Partial<ArrayRow> = {}): ArrayRow => ({
  bars: [
    { value: 5, tone: "plain", tag: "a" },
    { value: 2, tone: "good" },
    { value: 7, tone: "focus" },
  ],
  indices: ["0", "1", "2"],
  pointers: [],
  zones: [],
  ...over,
});
const model = (rows: ArrayRow[], scale = 9): ArrayModel => ({ kind: "array", rows, scale });

describe("ArrayShape", () => {
  it("draws one bar per value with the number above it and tags like 5a", () => {
    const { container } = render(<ArrayShape model={model([row()])} subject="Array" />);
    expect(container.querySelectorAll(".viz-array__bar")).toHaveLength(3);
    const values = [...container.querySelectorAll(".viz-array__value")].map((v) => v.textContent);
    expect(values).toEqual(["5a", "2", "7"]);
  });

  it("applies the tone as a class and focus as the glow", () => {
    const { container } = render(<ArrayShape model={model([row()])} subject="Array" />);
    expect(container.querySelector(".viz-array__bar--good")).not.toBeNull();
    expect(container.querySelectorAll(".viz-array__bar--focus")).toHaveLength(1);
  });

  it("renders exactly one tag per pointer and no empty tags", () => {
    const { container } = render(
      <ArrayShape
        model={model([
          row({
            pointers: [
              { label: "i", index: 0 },
              { label: "j", index: 2 },
            ],
          }),
        ])}
        subject="Array"
      />,
    );
    const tags = [...container.querySelectorAll(".viz-array__pointer")].map((t) => t.textContent);
    expect(tags).toEqual(["i", "j"]);
  });

  it("stacks two pointers on one index", () => {
    const { container } = render(
      <ArrayShape
        model={model([
          row({
            pointers: [
              { label: "i", index: 1 },
              { label: "j", index: 1 },
            ],
          }),
        ])}
        subject="Array"
      />,
    );
    const stacks = container.querySelectorAll(".viz-array__pointers");
    expect(stacks).toHaveLength(1);
    expect(stacks[0]?.textContent).toBe("ij");
  });

  it("draws zones across from..to with their label", () => {
    const { container } = render(
      <ArrayShape
        model={model([row({ zones: [{ from: 0, to: 1, label: "sorted", tone: "good" }] })])}
        subject="Array"
      />,
    );
    const zone = container.querySelector(".viz-array__zone--good") as HTMLElement;
    expect(zone.textContent).toBe("sorted");
    expect(zone.style.gridColumn).toBe("1 / 3");
  });

  it("null bars are dashed slots and next outlines one", () => {
    const { container } = render(
      <ArrayShape
        model={model([row({ bars: [{ value: 3, tone: "good" }, null, null], next: 1 })])}
        subject="Array"
      />,
    );
    expect(container.querySelectorAll(".viz-array__empty")).toHaveLength(2);
    const next = container.querySelectorAll(".viz-array__empty--next");
    expect(next).toHaveLength(1);
    expect(next[0]).toBe(container.querySelectorAll(".viz-array__empty")[0]);
  });

  it("bar height is value times a unit capped so scale fits the height max", () => {
    const { container } = render(<ArrayShape model={model([row()], 12)} subject="Array" />);
    const grid = container.querySelector(".viz-array__grid") as HTMLElement;
    expect(grid.style.getPropertyValue("--viz-array-scale")).toBe("12");
    const bar = container.querySelectorAll(".viz-array__bar")[0] as HTMLElement;
    expect(bar.style.getPropertyValue("--viz-array-value")).toBe("5");
  });

  it("each row shows its indices and optional label", () => {
    render(
      <ArrayShape
        model={model([row(), row({ label: "merged so far", indices: ["a", "b", "c"] })])}
        subject="Array"
      />,
    );
    expect(screen.getByText("merged so far")).toBeTruthy();
    expect(screen.getByText("c")).toBeTruthy();
  });

  it("role img label lists the first row's values", () => {
    render(<ArrayShape model={model([row()])} subject="Array" />);
    expect(screen.getByRole("img", { name: "Array: 5, 2, 7" })).toBeTruthy();
  });

  it("faded bars are dimmed", () => {
    const { container } = render(
      <ArrayShape
        model={model([row({ bars: [{ value: 1, tone: "plain", faded: true }] })])}
        subject="Array"
      />,
    );
    expect(container.querySelector(".viz-array__slot--faded")).not.toBeNull();
  });

  it("scales the whole drawing uniformly to the stage, capped at the maximum", () => {
    const scaleAt = (w: number, h: number) => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        width: w,
        height: h,
      } as DOMRect);
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(300);
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(200);
      const { container, unmount } = render(<ArrayShape model={model([row()])} subject="Array" />);
      const t = (container.querySelector(".viz-fit__inner") as HTMLElement).style.transform;
      unmount();
      vi.restoreAllMocks();
      return Number(/scale\(([\d.]+)\)/.exec(t)?.[1]);
    };
    expect(scaleAt(150, 1000)).toBe(0.5);
    expect(scaleAt(450, 1000)).toBe(1.5);
    expect(scaleAt(5000, 5000)).toBe(2);
  });
});
