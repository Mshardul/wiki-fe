import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FlowModel } from "@/lib/visualizer/core/flow";
import { FlowDiagram } from "./FlowDiagram";

const flow = (lit: number): FlowModel => ({
  lit,
  nodes: [
    { id: "app", kind: "client", label: "App" },
    { id: "cache", kind: "buffer", label: "Cache" },
    { id: "db", kind: "store", label: "DB" },
  ],
  edges: [
    { from: "app", to: "cache", step: 1, style: "solid", label: "get" },
    { from: "cache", to: "app", step: 2, style: "dotted", label: "miss" },
    { from: "cache", to: "db", step: 3, style: "dashed", label: "flush" },
  ],
});

describe("FlowDiagram", () => {
  it("is one labelled image with a node per kind and a numbered badge per edge", () => {
    const { container, getByRole, getByText } = render(
      <FlowDiagram flow={flow(0)} title="Cache-aside read" pulse={false} />,
    );
    expect(getByRole("img", { name: "Cache-aside read" })).toBeTruthy();
    for (const label of ["App", "Cache", "DB"]) expect(getByText(label)).toBeTruthy();
    expect(container.querySelectorAll(".viz-flow__badge")).toHaveLength(3);
    expect(container.querySelectorAll(".viz-flow__node")).toHaveLength(3);
  });

  it("lights edges up to the lit step and pulses only the current one while playing", () => {
    const { container, rerender } = render(<FlowDiagram flow={flow(2)} title="t" pulse />);
    const lit = () =>
      [...container.querySelectorAll(".viz-flow__edge")].map((e) => e.classList.contains("is-lit"));
    const cur = () =>
      [...container.querySelectorAll(".viz-flow__edge")].map((e) =>
        e.classList.contains("is-current"),
      );
    expect(lit()).toEqual([true, true, false]);
    expect(cur()).toEqual([false, true, false]);
    rerender(<FlowDiagram flow={flow(2)} title="t" pulse={false} />);
    expect(cur()).toEqual([false, false, false]);
    rerender(<FlowDiagram flow={flow(0)} title="t" pulse />);
    expect(lit()).toEqual([false, false, false]);
  });

  it("uses a distinct class per line style", () => {
    const { container } = render(<FlowDiagram flow={flow(3)} title="t" pulse={false} />);
    expect(container.querySelector(".viz-flow__edge--solid")).toBeTruthy();
    expect(container.querySelector(".viz-flow__edge--dashed")).toBeTruthy();
    expect(container.querySelector(".viz-flow__edge--dotted")).toBeTruthy();
  });

  it("each node kind draws a different icon", () => {
    const { container } = render(<FlowDiagram flow={flow(0)} title="t" pulse={false} />);
    const icons = [...container.querySelectorAll(".viz-flow__node .viz-flow__icon")].map((i) =>
      i.getAttribute("data-kind"),
    );
    expect(icons).toEqual(["client", "buffer", "store"]);
  });
});
