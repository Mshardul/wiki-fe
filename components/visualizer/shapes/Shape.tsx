import type { Size } from "@/lib/visualizer/core/geometry";
import { resolveAxis, type ShapeModel } from "@/lib/visualizer/core/shapes";
import { HistogramShape } from "./HistogramShape";
import { LinearShape } from "./LinearShape";
import { RankingShape } from "./RankingShape";
import { RingShape } from "./RingShape";

interface ShapeProps {
  model: ShapeModel;
  rotated: boolean;
  size: Size;
  subject: string;
}

export function Shape({ model, rotated, size, subject }: ShapeProps) {
  if (model.kind === "ring") return <RingShape model={model} subject={subject} />;
  if (model.kind === "ranking") return <RankingShape model={model} subject={subject} />;
  const axis = resolveAxis(model, rotated) ?? model.defaultAxis;
  if (model.kind === "linear") {
    return <LinearShape model={model} axis={axis} size={size} subject={subject} />;
  }
  return <HistogramShape model={model} axis={axis} subject={subject} />;
}
