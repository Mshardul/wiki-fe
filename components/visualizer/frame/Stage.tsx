import { type ReactNode, useRef } from "react";
import type { Size } from "@/lib/visualizer/core/geometry";
import type { Rich } from "@/lib/visualizer/core/rich";
import { useElementSize } from "../hooks/useElementSize";
import { RichText } from "../ui/RichText";

interface StageProps {
  metric: string;
  metricLabel: string;
  caption: Rich;
  children: (size: Size) => ReactNode;
}

export function Stage({ metric, metricLabel, caption, children }: StageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  return (
    <div className="viz-stage" ref={ref}>
      <div className="viz-stage__metric">
        <span className="viz-stage__metric-value">{metric}</span>
        <span className="viz-stage__metric-label">{metricLabel}</span>
      </div>
      {size.w > 0 && size.h > 0 && children(size)}
      <p className="viz-stage__caption" aria-live="polite">
        <RichText value={caption} />
      </p>
    </div>
  );
}
