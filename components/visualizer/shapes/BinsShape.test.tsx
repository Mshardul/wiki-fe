import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { binsLayout } from "@/lib/visualizer/core/bins-layout";
import { fitScale } from "@/lib/visualizer/core/fit";
import type { BinsModel } from "@/lib/visualizer/core/shapes";
import { BinsShape } from "./BinsShape";

const model = (o: Partial<BinsModel> = {}): BinsModel => ({
  kind: "bins",
  slots: 3,
  active: null,
  bins: [
    {
      id: "A",
      label: "A",
      hue: 0,
      count: "2",
      items: [
        { id: "k1", label: "12" },
        { id: "k2", label: "29", pending: true },
      ],
    },
    { id: "B", label: "B", hue: 1, count: "0", items: [] },
  ],
  ...o,
});

describe("BinsShape", () => {
  it("draws one column per bin with its name and count", () => {
    const { container } = render(<BinsShape model={model()} subject="Nodes" />);
    expect(container.querySelectorAll(".viz-bins__bin")).toHaveLength(2);
    expect(container.querySelector(".viz-bins__name")?.textContent).toBe("A");
    expect(container.querySelector(".viz-bins__count")?.textContent).toBe("2");
  });

  it("gives every item its bin's hue and keeps an empty bin drawn", () => {
    const { container } = render(<BinsShape model={model()} subject="Nodes" />);
    const items = container.querySelectorAll(".viz-bins__item");
    expect(items).toHaveLength(2);
    expect(items[0]?.classList.contains("viz-hue-0")).toBe(true);
    expect(container.querySelectorAll(".viz-bins__bin")[1]?.classList.contains("viz-hue-1")).toBe(
      true,
    );
  });

  it("fades a pending item and stacks it above the settled one", () => {
    const { container } = render(<BinsShape model={model()} subject="Nodes" />);
    const settled = container.querySelector<SVGGElement>(
      ".viz-bins__item:not(.viz-bins__item--pending)",
    );
    const pending = container.querySelector<SVGGElement>(".viz-bins__item--pending");
    const y = (g: SVGGElement | null) => Number(/, ([\d.]+)px/.exec(g?.style.transform ?? "")?.[1]);
    expect(y(pending)).toBeLessThan(y(settled));
  });

  it("rings a moved item and marks the active one", () => {
    const m = model();
    (m.bins[0]?.items[0] as { changed?: boolean }).changed = true;
    const { container } = render(<BinsShape model={{ ...m, active: "k1" }} subject="Nodes" />);
    const item = container.querySelector(".viz-bins__item");
    expect(item?.classList.contains("viz-bins__item--changed")).toBe(true);
    expect(item?.classList.contains("viz-bins__item--active")).toBe(true);
  });

  it("makes a heavy item two cells tall", () => {
    const m = model();
    m.bins[0]?.items.push({ id: "k3", label: "61 ×5", heavy: true });
    const { container } = render(<BinsShape model={m} subject="Nodes" />);
    const heights = [...container.querySelectorAll(".viz-bins__item rect")].map((r) =>
      Number(r.getAttribute("height")),
    );
    expect(Math.max(...heights)).toBeGreaterThan(2 * Math.min(...heights));
  });

  it("marks a new and a removed bin", () => {
    const m = model();
    (m.bins[0] as { state?: string }).state = "new";
    (m.bins[1] as { state?: string }).state = "removed";
    const { container } = render(<BinsShape model={m} subject="Nodes" />);
    expect(container.querySelector(".viz-bins__bin--new")).toBeTruthy();
    expect(container.querySelector(".viz-bins__bin--removed")).toBeTruthy();
  });

  it("moves an item between bins on the same element, not a new one", () => {
    const first = model();
    const { container, rerender } = render(<BinsShape model={first} subject="Nodes" />);
    const before = container.querySelectorAll(".viz-bins__item")[0];
    const moved = model();
    const item = moved.bins[0]?.items.shift();
    if (item) moved.bins[1]?.items.push(item);
    rerender(<BinsShape model={moved} subject="Nodes" />);
    const after = container.querySelectorAll(".viz-bins__item")[0];
    expect(after).toBe(before);
    expect(after?.classList.contains("viz-hue-1")).toBe(true);
  });

  it("describes the bins for a screen reader", () => {
    const { getByRole } = render(<BinsShape model={model()} subject="Nodes" />);
    expect(getByRole("img").getAttribute("aria-label")).toBe("Nodes: A: 12, 29; B: empty");
  });

  it("scales six bins down to fit a 320px stage", () => {
    const six = model({
      bins: Array.from({ length: 6 }, (_, i) => ({
        id: `n${i}`,
        label: "A",
        hue: i,
        count: "0",
        items: [],
      })),
    });
    const { width, height } = binsLayout(six);
    expect(fitScale({ width, height }, { width: 288, height: 300 })).toBeLessThan(1);
  });
});
