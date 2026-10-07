import type { CSSProperties } from "react";
import { linearLayout, type Point, type Size } from "@/lib/visualizer/core/geometry";
import type { Axis, LinearModel } from "@/lib/visualizer/core/shapes";

interface LinearShapeProps {
  model: LinearModel;
  axis: Axis;
  size: Size;
  subject: string;
}

export function LinearShape({ model, axis, size, subject }: LinearShapeProps) {
  const L = linearLayout(size, model.capacity, axis);
  const fontSize = Math.min(26, L.block.h * 0.42);
  const box = (p: Point): CSSProperties => ({
    left: p.x,
    top: p.y,
    width: L.block.w,
    height: L.block.h,
    fontSize,
  });
  const classOf = (key: string): string => {
    if (key === model.active && model.tone === "hit") return "viz-blk viz-blk--hit";
    if (key === model.active) return `viz-blk viz-blk--new viz-blk--enter-${axis}`;
    if (key === model.next) return "viz-blk viz-blk--next";
    return "viz-blk";
  };
  // The leaving key keeps its React key, so it slides from its slot to the exit.
  const blocks = model.items.map((key, i) => ({
    key,
    style: box(L.slot(i)),
    className: classOf(key),
  }));
  if (model.evicted) {
    blocks.push({ key: model.evicted, style: box(L.exit), className: "viz-blk viz-blk--out" });
  }
  const entry = axis === "vertical" ? model.labels.entry : `${model.labels.entry} →`;
  const exit = axis === "vertical" ? `${model.labels.exit} ↓` : `→ ${model.labels.exit}`;
  return (
    <div
      className="viz-linear"
      data-axis={axis}
      role="img"
      aria-label={`${subject}: ${model.items.join(", ")}`}
    >
      <div
        className={`viz-linear__frame viz-linear__frame--${axis}`}
        style={{ left: L.frame.x, top: L.frame.y, width: L.frame.w, height: L.frame.h }}
      />
      <span className="viz-linear__label" style={{ left: L.entryLabel.x, top: L.entryLabel.y }}>
        {entry}
      </span>
      <span
        className="viz-linear__label viz-linear__label--exit"
        style={{ left: L.exitLabel.x, top: L.exitLabel.y }}
      >
        {exit}
      </span>
      {blocks.map((b) => (
        <div key={b.key} className={b.className} style={b.style}>
          {b.key}
        </div>
      ))}
    </div>
  );
}
