import type { ReactNode } from "react";
import { compositeHeights, type Size } from "@/lib/visualizer/core/geometry";
import type { CompositeModel, LeafModel } from "@/lib/visualizer/core/shapes";

interface CompositeShapeProps {
  model: CompositeModel;
  size: Size;
  subject: string;
  renderPart: (part: LeafModel, size: Size) => ReactNode;
}

export function CompositeShape({ model, size, subject, renderPart }: CompositeShapeProps) {
  const heights = compositeHeights(size, model.parts);
  return (
    <div className="viz-composite" role="group" aria-label={subject}>
      {model.parts.map((part, i) => {
        const h = heights[i] ?? 0;
        return (
          // Parts are positional and fixed per algorithm, so the index is a stable key.
          <div key={`${i}-${part.kind}`} className="viz-composite__part" style={{ height: h }}>
            {renderPart(part, { w: size.w, h })}
          </div>
        );
      })}
    </div>
  );
}
