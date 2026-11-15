import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CircleModel } from "@/lib/visualizer/core/shapes";
import { CIRCLE_C, CIRCLE_LAYER_STEP, CIRCLE_R, CircleShape } from "./CircleShape";

const model = (o: Partial<CircleModel> = {}): CircleModel => ({
  kind: "circle",
  size: 100,
  arcs: [
    { from: 85, to: 22, hue: 2 },
    { from: 22, to: 85, hue: 1 },
  ],
  anchors: [
    { id: "B", at: 85, label: "B", hue: 1, count: "3", load: 3, extra: [], hot: true },
    { id: "C", at: 22, label: "C", hue: 2, count: "1", load: 1, extra: [11, 80] },
  ],
  points: [
    { id: "k0", at: 53, label: "12", hue: 1 },
    { id: "k1", at: 55, label: "18", hue: 1, changed: true },
  ],
  active: "k0",
  walk: null,
  ideal: 2,
  loadMax: 6,
  ...o,
});

const pos = (el: Element | null): [number, number] => {
  const m = /([-\d.]+)px, ([-\d.]+)px/.exec((el as SVGGElement | null)?.style.transform ?? "");
  return [Number(m?.[1]), Number(m?.[2])];
};

describe("CircleShape", () => {
  it("draws an arc per owner and a labelled anchor with its count", () => {
    const { container } = render(<CircleShape model={model()} subject="Ring" />);
    expect(container.querySelectorAll(".viz-circle__arc")).toHaveLength(2);
    expect(container.querySelectorAll(".viz-circle__name")[0]?.textContent).toBe("B");
    expect(container.querySelectorAll(".viz-circle__count")[1]?.textContent).toBe("1");
  });

  it("flags the busiest anchor with a dashed ring, not a colour", () => {
    const { container } = render(<CircleShape model={model()} subject="Ring" />);
    expect(container.querySelectorAll(".viz-circle__anchor--hot")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-circle__hot")).toHaveLength(1);
  });

  it("draws extra positions as small unlabelled markers", () => {
    const { container } = render(<CircleShape model={model()} subject="Ring" />);
    expect(container.querySelectorAll(".viz-circle__extra")).toHaveLength(2);
  });

  it("rings a moved point and lights the active one", () => {
    const { container } = render(<CircleShape model={model()} subject="Ring" />);
    expect(container.querySelectorAll(".viz-circle__point--changed")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-circle__point--active")).toHaveLength(1);
  });

  it("draws the walk arc only when given one", () => {
    const none = render(<CircleShape model={model()} subject="Ring" />);
    expect(none.container.querySelector(".viz-circle__walk")).toBeNull();
    const walking = render(
      <CircleShape model={model({ walk: { from: 53, to: 85 } })} subject="Ring" />,
    );
    expect(walking.container.querySelector(".viz-circle__walk")).toBeTruthy();
  });

  it("places position 0 at the top and 99 just left of it", () => {
    const at = (n: number) => {
      const m = model({ points: [{ id: "p", at: n, label: String(n), hue: 0 }] });
      const { container } = render(<CircleShape model={m} subject="Ring" />);
      return pos(container.querySelector(".viz-circle__point"));
    };
    const [ax, ay] = at(0);
    const [bx, by] = at(99);
    expect(ax).toBeCloseTo(CIRCLE_C, 3);
    expect(ay).toBeCloseTo(CIRCLE_C - CIRCLE_R, 3);
    expect(bx).toBeLessThan(CIRCLE_C);
    expect(bx).toBeGreaterThan(CIRCLE_C - 10);
    expect(by).toBeGreaterThan(ay);
  });

  it("treats 99 and 0 as neighbours across the wrap and moves one out a layer", () => {
    const m = model({
      points: [
        { id: "a", at: 0, label: "0", hue: 0 },
        { id: "b", at: 99, label: "99", hue: 0 },
      ],
    });
    const { container } = render(<CircleShape model={m} subject="Ring" />);
    const radii = [...container.querySelectorAll(".viz-circle__point")].map((el) => {
      const [x, y] = pos(el);
      return Math.round(Math.hypot(x - CIRCLE_C, y - CIRCLE_C));
    });
    expect(new Set(radii).size).toBe(2);
  });

  it("moves a point near another out a layer so the two stay readable", () => {
    const { container } = render(<CircleShape model={model()} subject="Ring" />);
    const [a, b] = [...container.querySelectorAll(".viz-circle__point")];
    const radius = (el: Element | undefined) => {
      const [x, y] = pos(el ?? null);
      return Math.hypot(x - CIRCLE_C, y - CIRCLE_C);
    };
    expect(radius(a)).toBeCloseTo(CIRCLE_R, 3);
    expect(radius(b)).toBeCloseTo(CIRCLE_R + CIRCLE_LAYER_STEP, 3);
  });

  it("keeps a point's element between frames while its owner hue changes", () => {
    const { container, rerender } = render(<CircleShape model={model()} subject="Ring" />);
    const before = container.querySelector(".viz-circle__point");
    const next = model();
    (next.points[0] as { hue: number }).hue = 2;
    rerender(<CircleShape model={next} subject="Ring" />);
    const after = container.querySelector(".viz-circle__point");
    expect(after).toBe(before);
    expect(after?.classList.contains("viz-hue-2")).toBe(true);
  });

  it("draws a lone owner as one full-circle arc", () => {
    const m = model({ arcs: [{ from: 22, to: 22, hue: 2 }], anchors: [], points: [] });
    const { container } = render(<CircleShape model={m} subject="Ring" />);
    expect(container.querySelector(".viz-circle__arc")?.getAttribute("d")).toContain("A");
  });
});
