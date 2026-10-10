import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  HistogramModel,
  LinearModel,
  RankingModel,
  RingModel,
} from "@/lib/visualizer/core/shapes";
import { HistogramShape } from "./HistogramShape";
import { LinearShape } from "./LinearShape";
import { RankingShape } from "./RankingShape";
import { RingShape } from "./RingShape";
import { Shape } from "./Shape";

const SIZE = { w: 800, h: 600 };
const linear: LinearModel = {
  kind: "linear",
  items: ["F", "A", "E", "D"],
  capacity: 4,
  next: "D",
  active: "F",
  tone: "new",
  removed: "C",
  labels: { entry: "newest", exit: "next out" },
  defaultAxis: "vertical",
};

describe("LinearShape", () => {
  it("draws one block per key plus the leaving key, top to bottom", () => {
    const { container } = render(
      <LinearShape model={linear} axis="vertical" size={SIZE} subject="Cache" />,
    );
    const blocks = [...container.querySelectorAll<HTMLElement>(".viz-blk")];
    expect(blocks.map((b) => b.textContent)).toEqual(["F", "A", "E", "D", "C"]);
    const tops = blocks.slice(0, 4).map((b) => Number.parseFloat(b.style.top));
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    expect(screen.getByRole("img", { name: "Cache: F, A, E, D" })).toBeTruthy();
  });

  it("marks the new key, the next-out key and the removed key", () => {
    const { container } = render(
      <LinearShape model={linear} axis="vertical" size={SIZE} subject="Cache" />,
    );
    const cls = (k: string) =>
      [...container.querySelectorAll(".viz-blk")].find((b) => b.textContent === k)?.className ?? "";
    expect(cls("F")).toContain("viz-blk--new");
    expect(cls("F")).toContain("viz-blk--enter-vertical");
    expect(cls("D")).toContain("viz-blk--next");
    expect(cls("C")).toContain("viz-blk--out");
    expect(cls("A")).toBe("viz-blk");
  });

  it("labels entry/exit with arrows that follow the axis", () => {
    const { rerender } = render(
      <LinearShape model={linear} axis="vertical" size={SIZE} subject="Cache" />,
    );
    expect(screen.getByText("newest")).toBeTruthy();
    expect(screen.getByText("next out ↓")).toBeTruthy();
    rerender(<LinearShape model={linear} axis="horizontal" size={SIZE} subject="Cache" />);
    expect(screen.getByText("newest →")).toBeTruthy();
    expect(screen.getByText("→ next out")).toBeTruthy();
  });

  it("a hit is marked without the enter animation", () => {
    const { container } = render(
      <LinearShape
        model={{ ...linear, tone: "existing", removed: null }}
        axis="vertical"
        size={SIZE}
        subject="Cache"
      />,
    );
    const f = [...container.querySelectorAll(".viz-blk")].find((b) => b.textContent === "F");
    expect(f?.className).toBe("viz-blk viz-blk--existing");
  });
});

describe("HistogramShape", () => {
  const hist: HistogramModel = {
    kind: "histogram",
    slots: [{ key: "A", count: 3 }, { key: "E", count: 1 }, null, null],
    next: "E",
    active: "A",
    tone: "existing",
    defaultAxis: "vertical",
  };

  it("bar heights follow counts; empty slots stay empty; next-out is flagged", () => {
    const { container } = render(<HistogramShape model={hist} axis="vertical" subject="Cache" />);
    const bars = [...container.querySelectorAll<HTMLElement>(".viz-hist__bar")];
    expect(bars.map((b) => b.style.height)).toEqual(["60%", "20%", "0%", "0%"]);
    expect(screen.getByText("next out")).toBeTruthy();
    expect(container.querySelector(".viz-hist__col--existing")?.textContent).toContain("A");
  });

  it("each count sits on its own bar", () => {
    const { container } = render(<HistogramShape model={hist} axis="vertical" subject="Cache" />);
    const bars = [...container.querySelectorAll(".viz-hist__bar")];
    expect(bars.map((b) => b.querySelector(".viz-hist__count")?.textContent)).toEqual([
      "3×",
      "1×",
      "",
      "",
    ]);
  });

  it("horizontal bars use width", () => {
    const { container } = render(<HistogramShape model={hist} axis="horizontal" subject="Cache" />);
    expect(container.querySelector<HTMLElement>(".viz-hist__bar")?.style.width).toBe("60%");
  });

  it("a cache with no next-out shows no flag", () => {
    render(<HistogramShape model={{ ...hist, next: null }} axis="vertical" subject="Cache" />);
    expect(screen.queryByText("next out")).toBeNull();
  });
});

describe("RankingShape", () => {
  const ranking: RankingModel = {
    kind: "ranking",
    rows: [
      { key: "A", count: 3 },
      { key: "F", count: 1 },
      { key: "E", count: 1 },
      { key: "D", count: 1 },
    ],
    capacity: 4,
    next: "D",
    active: "F",
    tone: "new",
    removed: "C",
  };
  const row = (container: HTMLElement, key: string) =>
    [...container.querySelectorAll<HTMLElement>(".viz-rank__row")].find(
      (r) => r.querySelector(".viz-rank__key")?.textContent === key,
    );

  it("each key sits at its rank with its count beside it", () => {
    const { container } = render(<RankingShape model={ranking} subject="Cache" />);
    const rankOf = (k: string) => row(container, k)?.style.getPropertyValue("--rank");
    expect(["A", "F", "E", "D"].map(rankOf)).toEqual(["0", "1", "2", "3"]);
    expect(row(container, "A")?.querySelector(".viz-rank__count")?.textContent).toBe("3×");
    expect(row(container, "D")?.querySelector(".viz-rank__count")?.textContent).toBe("1×");
    expect(screen.getByRole("img", { name: "Cache: A, F, E, D" })).toBeTruthy();
  });

  it("keeps the rows in a fixed DOM order so a reorder animates instead of re-mounting", () => {
    const { container, rerender } = render(<RankingShape model={ranking} subject="Cache" />);
    const order = () =>
      [...container.querySelectorAll(".viz-rank__row .viz-rank__key")].map((k) => k.textContent);
    const before = order();
    rerender(
      <RankingShape
        subject="Cache"
        model={{
          ...ranking,
          rows: [
            ranking.rows[1],
            ranking.rows[0],
            ranking.rows[2],
            ranking.rows[3],
          ] as RankingModel["rows"],
        }}
      />,
    );
    expect(order()).toEqual(before);
  });

  it("marks the new key, the next-out row and the key that just left", () => {
    const { container } = render(<RankingShape model={ranking} subject="Cache" />);
    expect(row(container, "F")?.className).toContain("viz-rank__row--new");
    expect(row(container, "D")?.className).toContain("viz-rank__row--next");
    expect(screen.getByText("next out")).toBeTruthy();
    const out = container.querySelector(".viz-rank__row--out");
    expect(out?.textContent).toContain("C");
  });

  it("a hit shows +1 on the active row, a miss does not", () => {
    const { container, rerender } = render(
      <RankingShape
        model={{ ...ranking, tone: "existing", active: "A", removed: null }}
        subject="Cache"
      />,
    );
    expect(row(container, "A")?.className).toContain("viz-rank__row--existing");
    expect(row(container, "A")?.textContent).toContain("+1");
    rerender(<RankingShape model={ranking} subject="Cache" />);
    expect(container.textContent).not.toContain("+1");
  });

  it("draws a placeholder for every slot, faint when no row holds it yet", () => {
    const { container } = render(
      <RankingShape
        model={{ ...ranking, rows: ranking.rows.slice(0, 2), next: null, removed: null }}
        subject="Cache"
      />,
    );
    const slots = [...container.querySelectorAll(".viz-rank__slot")];
    expect(slots).toHaveLength(4);
    expect(slots.map((s) => s.className.includes("is-empty"))).toEqual([false, false, true, true]);
  });
});

describe("RingShape", () => {
  const ring: RingModel = {
    kind: "ring",
    slots: [{ key: "E", bit: 1 }, { key: "B", bit: 0 }, null, { key: "D", bit: 0 }],
    hand: 1,
    turns: 5,
    cleared: [3],
    active: 0,
    tone: "new",
  };

  it("draws every slot, bits, and rotates the hand by cumulative turns", () => {
    const { container } = render(<RingShape model={ring} subject="Cache" />);
    expect(container.querySelectorAll(".viz-ring__slot")).toHaveLength(4);
    expect(container.querySelectorAll(".viz-ring__bit--1")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-ring__bit--0")).toHaveLength(2);
    expect(container.querySelector<SVGGElement>(".viz-ring__hand")?.style.transform).toBe(
      "rotate(450deg)",
    );
    expect(container.querySelector(".viz-ring__slot--new")).toBeTruthy();
    expect(container.querySelector(".viz-ring__slot--cleared")).toBeTruthy();
  });
});

describe("Shape dispatcher", () => {
  it("rotation swaps the linear axis", () => {
    const { container, rerender } = render(
      <Shape model={linear} rotated={false} size={SIZE} subject="Cache" />,
    );
    expect(container.querySelector(".viz-linear")?.getAttribute("data-axis")).toBe("vertical");
    rerender(<Shape model={linear} rotated size={SIZE} subject="Cache" />);
    expect(container.querySelector(".viz-linear")?.getAttribute("data-axis")).toBe("horizontal");
  });
});
