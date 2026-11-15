import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RunsModel } from "@/lib/visualizer/core/shapes";
import { RunsShape } from "./RunsShape";

const model = (o: Partial<RunsModel> = {}): RunsModel => ({
  kind: "runs",
  cells: [
    { id: "k0", label: "12", hue: 0 },
    { id: "k1", label: "18", hue: 0, changed: true },
    { id: "k2", label: "61", hue: 1, heavy: true },
  ],
  braces: [
    { from: 0, to: 1, hue: 0, label: "A", detail: "0–32", note: "2 keys" },
    { from: 2, to: 2, hue: 1, label: "B", detail: "33–65", note: "1 key" },
  ],
  ...o,
});

describe("RunsShape", () => {
  it("draws a cell per key and a brace per run with range and count", () => {
    const { container } = render(<RunsShape model={model()} subject="Keys" />);
    expect(container.querySelectorAll(".viz-runs__cell")).toHaveLength(3);
    expect(container.querySelectorAll(".viz-runs__brace")).toHaveLength(2);
    expect(container.querySelectorAll(".viz-runs__range")[1]?.textContent).toBe("33–65");
    expect(container.querySelectorAll(".viz-runs__note")[0]?.textContent).toBe("2 keys");
  });

  it("colours cells by owner and rings the moved one", () => {
    const { container } = render(<RunsShape model={model()} subject="Keys" />);
    const cells = container.querySelectorAll(".viz-runs__cell");
    expect(cells[2]?.classList.contains("viz-hue-1")).toBe(true);
    expect(cells[1]?.classList.contains("viz-runs__cell--changed")).toBe(true);
  });

  it("draws a heavy cell double width", () => {
    const { container } = render(<RunsShape model={model()} subject="Keys" />);
    const widths = [...container.querySelectorAll(".viz-runs__cell rect")].map((r) =>
      Number(r.getAttribute("width")),
    );
    expect(widths[2]).toBeGreaterThan(2 * (widths[0] ?? 0));
  });

  it("shows an empty range as a dashed placeholder with its own brace", () => {
    const m = model();
    m.braces.splice(1, 0, { from: 2, to: 1, hue: 2, label: "C", detail: "33–65", note: "0 keys" });
    const { container } = render(<RunsShape model={m} subject="Keys" />);
    expect(container.querySelectorAll(".viz-runs__hole")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-runs__brace")).toHaveLength(3);
  });

  it("draws an empty model without cells", () => {
    const { container } = render(
      <RunsShape model={{ kind: "runs", cells: [], braces: [] }} subject="Keys" />,
    );
    expect(container.querySelectorAll(".viz-runs__cell")).toHaveLength(0);
  });

  it("keeps a cell's element between frames when its owner changes", () => {
    const { container, rerender } = render(<RunsShape model={model()} subject="Keys" />);
    const before = container.querySelectorAll(".viz-runs__cell")[1];
    const next = model();
    (next.cells[1] as { hue: number }).hue = 3;
    rerender(<RunsShape model={next} subject="Keys" />);
    expect(container.querySelectorAll(".viz-runs__cell")[1]).toBe(before);
  });
});
