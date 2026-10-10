import type { FlowNodeKind } from "@/lib/visualizer/core/flow";

// Drawn around (0, 0), about 44 by 44, so a node can place it with a translate.
export function FlowIcon({ kind }: { kind: FlowNodeKind }) {
  return (
    <g className="viz-flow__icon" data-kind={kind}>
      {kind === "client" && (
        <>
          <rect x={-20} y={-16} width={40} height={32} rx={4} />
          <path d="M -20 -8 H 20" />
          <circle cx={-14} cy={-12} r={1.5} className="viz-flow__dot" />
          <circle cx={-9} cy={-12} r={1.5} className="viz-flow__dot" />
        </>
      )}
      {kind === "buffer" && (
        <>
          <rect x={-18} y={-18} width={36} height={36} rx={8} />
          <path d="M 3 -11 L -7 2 H 0 L -3 11 L 7 -2 H 0 Z" className="viz-flow__dot" />
        </>
      )}
      {kind === "store" && (
        <>
          <ellipse cx={0} cy={-12} rx={16} ry={6} />
          <path d="M -16 -12 V 12 A 16 6 0 0 0 16 12 V -12" />
          <path d="M -16 0 A 16 6 0 0 0 16 0" />
        </>
      )}
    </g>
  );
}
