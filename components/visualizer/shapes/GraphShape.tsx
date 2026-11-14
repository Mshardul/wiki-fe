import { useId } from "react";
import {
  type ArrayTone,
  type GraphEdge,
  type GraphModel,
  type GraphNode,
  modelKeys,
} from "@/lib/visualizer/core/shapes";
import { FitBox } from "./FitBox";

// Mirror --viz-graph-node, --viz-graph-pitch and --viz-graph-pad in css/tokens.css (a test keeps them equal).
export const GRAPH_NODE = 34;
export const GRAPH_PITCH = 64;
export const GRAPH_PAD = 28;

const R = GRAPH_NODE / 2;
const TONE_WORD: Record<ArrayTone, string> = {
  plain: "not reached",
  warn: "waiting",
  accent: "current",
  good: "done",
  focus: "being compared",
};

interface Point {
  x: number;
  y: number;
}

function EdgeView({ edge, a, b, marker }: { edge: GraphEdge; a: Point; b: Point; marker: string }) {
  const cls = `viz-graph__edge viz-graph__edge--${edge.state}`;
  if (edge.from === edge.to) {
    const { x, y } = a;
    return (
      <path
        className={`${cls} viz-graph__loop`}
        d={`M ${x - 8} ${y - R} C ${x - 26} ${y - R - 30}, ${x + 26} ${y - R - 30}, ${x + 8} ${y - R}`}
        fill="none"
        markerEnd={edge.directed ? `url(#${marker})` : undefined}
      />
    );
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const end = edge.directed ? R + 3 : 0;
  return (
    <>
      <line
        className={cls}
        x1={a.x}
        y1={a.y}
        x2={b.x - ux * end}
        y2={b.y - uy * end}
        markerEnd={edge.directed ? `url(#${marker})` : undefined}
      />
      {edge.label !== undefined && (
        <text
          className="viz-graph__weight"
          x={(a.x + b.x) / 2 - uy * 11}
          y={(a.y + b.y) / 2 + ux * 11}
          textAnchor="middle"
          dy="0.35em"
        >
          {edge.label}
        </text>
      )}
    </>
  );
}

function NodeView({ node, at }: { node: GraphNode; at: Point }) {
  const side = node.side ? ` viz-graph__node--side-${node.side}` : "";
  const faded = node.faded ? " viz-graph__node--faded" : "";
  return (
    <g
      className={`viz-graph__node viz-graph__node--${node.tone}${side}${faded}`}
      transform={`translate(${at.x} ${at.y})`}
    >
      <circle r={R} />
      <text className="viz-graph__label" textAnchor="middle" dy="0.35em">
        {node.label}
      </text>
      {node.order !== undefined && (
        <text className="viz-graph__order" x={-R + 1} y={-R + 1} textAnchor="middle" dy="0.35em">
          {node.order}
        </text>
      )}
      {node.badge !== undefined && (
        <g className="viz-graph__badge" transform={`translate(${R - 2} ${R - 2})`}>
          <rect x={-12} y={-8} width={24} height={16} rx={8} />
          <text textAnchor="middle" dy="0.35em">
            {node.badge}
          </text>
        </g>
      )}
    </g>
  );
}

export function GraphShape({ model, subject }: { model: GraphModel; subject: string }) {
  const marker = `viz-graph-arrow-${useId().replace(/:/g, "")}`;
  const width = model.cols * GRAPH_PITCH + 2 * GRAPH_PAD;
  const height = model.height * GRAPH_PITCH + 2 * GRAPH_PAD;
  const at = (n: { x: number; y: number }): Point => ({
    x: GRAPH_PAD + n.x * GRAPH_PITCH,
    y: GRAPH_PAD + n.y * GRAPH_PITCH,
  });
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  const label = model.nodes.map((n) => `${n.label} ${TONE_WORD[n.tone]}`).join(", ");
  return (
    <div
      className={`viz-graph${model.settled ? " viz-graph--settled" : ""}`}
      role="img"
      aria-label={`${subject}: ${label || modelKeys(model).join(", ")}`}
    >
      <FitBox className="viz-graph__fit">
        <svg
          className="viz-graph__svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          <defs>
            <marker
              id={marker}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
          </defs>
          {model.rows.map((row) => (
            <g key={`r${row.y}`} className="viz-graph__rowwrap">
              <rect
                className={`viz-graph__row${row.outlined ? " viz-graph__row--outlined" : ""}`}
                x={4}
                y={GRAPH_PAD + row.y * GRAPH_PITCH - GRAPH_PITCH / 2 + 4}
                width={width - 8}
                height={GRAPH_PITCH - 8}
                rx={10}
              />
              {row.label && (
                <text
                  className="viz-graph__rowlabel"
                  x={14}
                  y={GRAPH_PAD + row.y * GRAPH_PITCH - GRAPH_PITCH / 2 + 18}
                >
                  {row.label}
                </text>
              )}
            </g>
          ))}
          {model.edges.map((e) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            return (
              <EdgeView key={`${e.from}>${e.to}`} edge={e} a={at(a)} b={at(b)} marker={marker} />
            );
          })}
          {model.nodes.map((n) => (
            // Node position is the identity; it never moves between frames.
            <NodeView key={n.id} node={n} at={at(n)} />
          ))}
        </svg>
      </FitBox>
    </div>
  );
}
