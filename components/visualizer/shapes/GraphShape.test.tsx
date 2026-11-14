import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type GraphModel, type GraphNode, modelKeys } from "@/lib/visualizer/core/shapes";
import { GRAPH_NODE, GRAPH_PAD, GRAPH_PITCH, GraphShape } from "./GraphShape";

const node = (id: string, x: number, y: number, o: Partial<GraphNode> = {}): GraphNode => ({
  id,
  label: id,
  x,
  y,
  tone: "plain",
  ...o,
});
const model = (o: Partial<GraphModel> = {}): GraphModel => ({
  kind: "graph",
  nodes: [node("A", 0, 0), node("B", 1, 0), node("C", 0.5, 1)],
  edges: [
    { from: "A", to: "B", state: "plain", directed: false },
    { from: "A", to: "C", state: "tree", directed: false },
  ],
  rows: [],
  cols: 1,
  height: 1,
  settled: false,
  ...o,
});

describe("GraphShape", () => {
  it("draws one circle per node with its label and a tone class", () => {
    const { container } = render(
      <GraphShape
        model={model({
          nodes: [node("A", 0, 0, { tone: "accent" }), node("B", 1, 0, { tone: "good" })],
        })}
        subject="Graph"
      />,
    );
    expect(container.querySelectorAll(".viz-graph__node")).toHaveLength(2);
    expect(container.querySelector(".viz-graph__node--accent")).not.toBeNull();
    expect(container.querySelector(".viz-graph__node--good")).not.toBeNull();
    expect(container.textContent).toContain("A");
  });

  it("shows the visit order as a number and a badge as a pill", () => {
    const { container } = render(
      <GraphShape
        model={model({ nodes: [node("A", 0, 0, { order: 3, badge: "∞" })] })}
        subject="Graph"
      />,
    );
    expect(container.querySelector(".viz-graph__order")?.textContent).toBe("3");
    expect(container.querySelector(".viz-graph__badge")?.textContent).toBe("∞");
  });

  it("fills the two sides differently and dims a faded node", () => {
    const { container } = render(
      <GraphShape
        model={model({
          nodes: [node("A", 0, 0, { side: "a" }), node("B", 1, 0, { side: "b", faded: true })],
        })}
        subject="Graph"
      />,
    );
    expect(container.querySelector(".viz-graph__node--side-a")).not.toBeNull();
    expect(
      container.querySelector(".viz-graph__node--side-b.viz-graph__node--faded"),
    ).not.toBeNull();
  });

  it("draws an arrowhead only when directed and a weight label", () => {
    const { container } = render(
      <GraphShape
        model={model({
          edges: [
            { from: "A", to: "B", state: "plain", directed: true, label: "4" },
            { from: "A", to: "C", state: "plain", directed: false },
          ],
        })}
        subject="Graph"
      />,
    );
    const lines = [...container.querySelectorAll("line.viz-graph__edge")];
    expect(lines).toHaveLength(2);
    expect(lines[0]?.getAttribute("marker-end")).toContain("url(#");
    expect(lines[1]?.getAttribute("marker-end")).toBeNull();
    expect(container.querySelector(".viz-graph__weight")?.textContent).toBe("4");
  });

  it("gives each edge its state class and flashes a conflict", () => {
    const { container } = render(
      <GraphShape
        model={model({
          edges: [
            { from: "A", to: "B", state: "flash", directed: false },
            { from: "A", to: "C", state: "skipped", directed: false },
          ],
        })}
        subject="Graph"
      />,
    );
    expect(container.querySelector(".viz-graph__edge--flash")).not.toBeNull();
    expect(container.querySelector(".viz-graph__edge--skipped")).not.toBeNull();
  });

  it("draws a self-loop as an arc, not a zero-length line", () => {
    const { container } = render(
      <GraphShape
        model={model({ edges: [{ from: "A", to: "A", state: "plain", directed: false }] })}
        subject="Graph"
      />,
    );
    expect(container.querySelector("path.viz-graph__loop")).not.toBeNull();
    expect(container.querySelectorAll("line.viz-graph__edge")).toHaveLength(0);
  });

  it("draws row bands, outlines one and shows a row label", () => {
    const { container } = render(
      <GraphShape
        model={model({
          rows: [{ y: 0 }, { y: 1, outlined: true, label: "not reached" }],
        })}
        subject="Graph"
      />,
    );
    expect(container.querySelectorAll(".viz-graph__row")).toHaveLength(2);
    expect(container.querySelectorAll(".viz-graph__row--outlined")).toHaveLength(1);
    expect(container.textContent).toContain("not reached");
  });

  it("marks a settled drawing on the root", () => {
    const { container } = render(<GraphShape model={model({ settled: true })} subject="Graph" />);
    expect(container.querySelector(".viz-graph--settled")).not.toBeNull();
  });

  it("sits inside a FitBox", () => {
    const { container } = render(<GraphShape model={model()} subject="Graph" />);
    expect(container.querySelector(".viz-fit")).not.toBeNull();
  });

  it("labels the picture with each node and its state", () => {
    const { container } = render(
      <GraphShape
        model={model({ nodes: [node("A", 0, 0, { tone: "accent" })] })}
        subject="Graph"
      />,
    );
    expect(container.querySelector("[role=img]")?.getAttribute("aria-label")).toBe(
      "Graph: A current",
    );
  });

  it("keeps its size constants equal to the tokens", () => {
    const css = readFileSync("css/tokens.css", "utf8");
    const px = (name: string) => Number(new RegExp(`--${name}:\\s*(\\d+)px`).exec(css)?.[1]);
    expect(px("viz-graph-node")).toBe(GRAPH_NODE);
    expect(px("viz-graph-pitch")).toBe(GRAPH_PITCH);
    expect(px("viz-graph-pad")).toBe(GRAPH_PAD);
  });

  it("modelKeys returns the node labels", () => {
    expect(modelKeys(model())).toEqual(["A", "B", "C"]);
  });
});
