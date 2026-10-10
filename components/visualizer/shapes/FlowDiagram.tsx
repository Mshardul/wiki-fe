import { useId, useMemo } from "react";
import { FLOW_H, FLOW_HALF, FLOW_W, type FlowModel, flowLayout } from "@/lib/visualizer/core/flow";
import { FlowIcon } from "./FlowIcon";

interface FlowDiagramProps {
  flow: FlowModel;
  title: string;
  // True while the loop is playing, so the current edge pulses; false when holding or paused.
  pulse: boolean;
}

export function FlowDiagram({ flow, title, pulse }: FlowDiagramProps) {
  const uid = useId().replace(/:/g, "");
  const layout = useMemo(() => flowLayout(flow.nodes, flow.edges), [flow.nodes, flow.edges]);
  return (
    <svg className="viz-flow" viewBox={`0 0 ${FLOW_W} ${FLOW_H}`} role="img" aria-label={title}>
      <defs>
        {(["off", "on"] as const).map((tone) => (
          <marker
            key={tone}
            id={`${uid}-${tone}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className={`viz-flow__head viz-flow__head--${tone}`} />
          </marker>
        ))}
      </defs>
      {layout.edges.map((e) => {
        const lit = e.step <= flow.lit;
        const current = pulse && e.step === flow.lit;
        return (
          <g
            key={`${e.step}-${e.d}`}
            className={`viz-flow__edge viz-flow__edge--${e.style}${lit ? " is-lit" : ""}${current ? " is-current" : ""}`}
          >
            <path d={e.d} markerEnd={`url(#${uid}-${lit ? "on" : "off"})`} />
            {e.label && (
              <text className="viz-flow__label" x={e.lx} y={e.ly} textAnchor={e.la}>
                {e.label}
              </text>
            )}
            <g className="viz-flow__badge" transform={`translate(${e.bx} ${e.by})`}>
              <circle r={7} />
              <text textAnchor="middle" dy="3.5">
                {e.step}
              </text>
            </g>
          </g>
        );
      })}
      {layout.nodes.map((n) => (
        <g key={n.id} className="viz-flow__node" transform={`translate(${n.x} ${n.y})`}>
          <FlowIcon kind={n.kind} />
          <text className="viz-flow__name" y={FLOW_HALF + 14} textAnchor="middle">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
