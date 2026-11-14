import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type HeapModel, type HeapNode, modelKeys } from "@/lib/visualizer/core/shapes";
import { HEAP_GAP_X, HEAP_GAP_Y, HEAP_NODE, HeapShape } from "./HeapShape";

const n = (value: number, tone: HeapNode["tone"] = "plain", tag?: string): HeapNode => ({
  value,
  tone,
  ...(tag ? { tag } : {}),
});
const model = (o: Partial<HeapModel> = {}): HeapModel => ({
  kind: "heap",
  nodes: [n(1), n(3), n(2)],
  capacity: 3,
  lit: null,
  leaving: null,
  array: {
    kind: "array",
    rows: [
      {
        bars: [
          { value: 1, tone: "plain" },
          { value: 3, tone: "plain" },
          { value: 2, tone: "plain" },
        ],
        indices: ["0", "1", "2"],
        pointers: [],
        zones: [{ from: 0, to: 2, label: "L0", tone: "plain" }],
      },
    ],
    scale: 3,
  },
  ...o,
});

const nodeX = (container: HTMLElement): string[] =>
  [...container.querySelectorAll(".viz-heap__node")].map((g) => g.getAttribute("transform") ?? "");

describe("HeapShape", () => {
  it("draws one node per non-null slot with the value and tag", () => {
    const { container } = render(
      <HeapShape
        model={model({ nodes: [n(5, "plain", "a"), n(5, "plain", "b"), null] })}
        subject="Heap"
      />,
    );
    expect(container.querySelectorAll(".viz-heap__node")).toHaveLength(2);
    expect(container.textContent).toContain("a");
    expect(container.textContent).toContain("b");
  });

  it("tone is a class on the node", () => {
    const { container } = render(
      <HeapShape
        model={model({ nodes: [n(1, "accent"), n(3, "focus"), n(2, "good")] })}
        subject="Heap"
      />,
    );
    expect(container.querySelector(".viz-heap__node--accent")).not.toBeNull();
    expect(container.querySelector(".viz-heap__node--focus")).not.toBeNull();
    expect(container.querySelector(".viz-heap__node--good")).not.toBeNull();
  });

  it("draws one edge per node below the root and lights only the lit pair", () => {
    const { container } = render(<HeapShape model={model({ lit: [1, 0] })} subject="Heap" />);
    expect(container.querySelectorAll(".viz-heap__edge")).toHaveLength(2);
    expect(container.querySelectorAll(".viz-heap__edge--lit")).toHaveLength(1);
  });

  it("null slots are dashed", () => {
    const { container } = render(
      <HeapShape model={model({ nodes: [null, n(3), n(2)] })} subject="Heap" />,
    );
    expect(container.querySelectorAll(".viz-heap__empty")).toHaveLength(1);
  });

  it("layout depends on capacity, so the first nodes never move as the heap grows", () => {
    const small = render(
      <HeapShape model={model({ nodes: [n(1), n(3), n(2)], capacity: 7 })} subject="H" />,
    );
    const full = render(
      <HeapShape
        model={model({ nodes: [n(1), n(3), n(2), n(4), n(5), n(6), n(7)], capacity: 7 })}
        subject="H"
      />,
    );
    expect(nodeX(small.container)).toEqual(nodeX(full.container).slice(0, 3));
  });

  it("leaving renders a ghost with an arrow out", () => {
    const { container } = render(<HeapShape model={model({ leaving: n(9) })} subject="Heap" />);
    expect(container.querySelector(".viz-heap__node--ghost")).not.toBeNull();
    expect(container.querySelector(".viz-heap__out")).not.toBeNull();
  });

  it("role img label lists the values in array order", () => {
    const { container } = render(<HeapShape model={model()} subject="Heap" />);
    expect(container.querySelector("[role=img]")?.getAttribute("aria-label")).toBe("Heap: 1, 3, 2");
    expect(modelKeys(model({ nodes: [null, n(3)] }))).toEqual(["3"]);
  });

  it("geometry constants mirror the css tokens", () => {
    const css = readFileSync("css/tokens.css", "utf8");
    expect(css).toContain(`--viz-heap-node: ${HEAP_NODE}px`);
    expect(css).toContain(`--viz-heap-gap-x: ${HEAP_GAP_X}px`);
    expect(css).toContain(`--viz-heap-gap-y: ${HEAP_GAP_Y}px`);
  });

  it("draws the array bars with level bands under the tree as one picture", () => {
    const { container } = render(<HeapShape model={model()} subject="Heap" />);
    const svg = container.querySelector(".viz-heap__svg") as Element;
    const rows = container.querySelector(".viz-array__rows") as Element;
    expect(container.querySelectorAll(".viz-array__bar")).toHaveLength(3);
    expect(container.querySelector(".viz-array__zone")?.textContent).toBe("L0");
    expect(svg.compareDocumentPosition(rows) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll(".viz-heap")).toHaveLength(1);
  });

  it("scales tree and array together to the stage, so a bigger stage gives a bigger figure", () => {
    const scaleAt = (w: number, h: number) => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        width: w,
        height: h,
      } as DOMRect);
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(200);
      const { container, unmount } = render(<HeapShape model={model()} subject="Heap" />);
      const t = (container.querySelector(".viz-fit__inner") as HTMLElement).style.transform;
      unmount();
      vi.restoreAllMocks();
      return Number(/scale\(([\d.]+)\)/.exec(t)?.[1]);
    };
    expect(scaleAt(200, 400)).toBe(0.5);
    expect(scaleAt(600, 400)).toBeGreaterThan(scaleAt(200, 400));
  });
});

describe("HeapShape without an array", () => {
  const tree = model();
  delete tree.array;

  it("draws the tree and no bars", () => {
    const { container } = render(<HeapShape model={tree} subject="Heap" />);
    expect(container.querySelectorAll(".viz-heap__node")).toHaveLength(3);
    expect(container.querySelector(".viz-array__rows")).toBeNull();
  });

  it("lays the tree out by capacity only", () => {
    const wide = { ...tree, capacity: 7, nodes: [n(1), n(3), n(2)] };
    const a = nodeX(render(<HeapShape model={wide} subject="Heap" />).container);
    const b = nodeX(
      render(<HeapShape model={{ ...wide, nodes: [n(9), n(8), n(7)] }} subject="Heap" />).container,
    );
    expect(a).toEqual(b);
  });
});
