import { isDense, type Size } from "@/lib/visualizer/core/geometry";
import { resolveAxis, type ShapeModel } from "@/lib/visualizer/core/shapes";
import { CompositeShape } from "./CompositeShape";
import { HistogramShape } from "./HistogramShape";
import { LanesShape } from "./LanesShape";
import { LinearShape } from "./LinearShape";
import { RankingShape } from "./RankingShape";
import { RingShape } from "./RingShape";
import { TimelineShape } from "./TimelineShape";

interface ShapeProps {
  model: ShapeModel;
  rotated: boolean;
  size: Size;
  subject: string;
  dense?: boolean;
}

export function Shape({ model, rotated, size, subject, dense = isDense(size) }: ShapeProps) {
  if (model.kind === "ring") return <RingShape model={model} subject={subject} />;
  if (model.kind === "ranking") return <RankingShape model={model} subject={subject} />;
  if (model.kind === "lanes") return <LanesShape model={model} subject={subject} />;
  if (model.kind === "timeline")
    return <TimelineShape model={model} size={size} subject={subject} dense={dense} />;
  if (model.kind === "composite") {
    return (
      <CompositeShape
        model={model}
        size={size}
        subject={subject}
        renderPart={(part, partSize) => (
          <Shape model={part} rotated={false} size={partSize} subject={subject} dense={dense} />
        )}
      />
    );
  }
  const axis = resolveAxis(model, rotated) ?? model.defaultAxis;
  if (model.kind === "linear") {
    return <LinearShape model={model} axis={axis} size={size} subject={subject} />;
  }
  return <HistogramShape model={model} axis={axis} subject={subject} />;
}
