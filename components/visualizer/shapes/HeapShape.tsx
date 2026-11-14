import { type HeapModel, type HeapNode, modelKeys } from "@/lib/visualizer/core/shapes";
import { levelCount, parentIndex, treeSlot } from "@/lib/visualizer/core/tree";
import { ArrayRows } from "./ArrayShape";
import { FitBox } from "./FitBox";

// Mirror --viz-heap-node, --viz-heap-gap-x and --viz-heap-gap-y in css/tokens.css (a test keeps them equal).
export const HEAP_NODE = 34;
export const HEAP_GAP_X = 10;
export const HEAP_GAP_Y = 46;

const PAD = HEAP_NODE + HEAP_GAP_X;
const R = HEAP_NODE / 2;

function NodeView({
  node,
  cx,
  cy,
  ghost,
}: {
  node: HeapNode;
  cx: number;
  cy: number;
  ghost?: boolean;
}) {
  return (
    <g
      className={`viz-heap__node viz-heap__node--${node.tone}${ghost ? " viz-heap__node--ghost" : ""}`}
      transform={`translate(${cx} ${cy})`}
    >
      <circle r={R} />
      <text className="viz-heap__value" textAnchor="middle" dy="0.35em">
        {node.value}
      </text>
      {node.tag && (
        <text className="viz-heap__tag" textAnchor="middle" x={R - 2} y={-R + 6}>
          {node.tag}
        </text>
      )}
    </g>
  );
}

export function HeapShape({ model, subject }: { model: HeapModel; subject: string }) {
  const levels = Math.max(1, levelCount(model.capacity));
  const width = 2 ** (levels - 1) * (HEAP_NODE + HEAP_GAP_X);
  const height = (levels - 1) * HEAP_GAP_Y + HEAP_NODE;
  const at = (i: number) => {
    const s = treeSlot(i);
    return { cx: PAD + s.x * width, cy: R + s.y * HEAP_GAP_Y };
  };
  const lit = model.lit;
  return (
    <div className="viz-heap" role="img" aria-label={`${subject}: ${modelKeys(model).join(", ")}`}>
      <FitBox className="viz-heap__fit">
        <svg
          className="viz-heap__svg"
          width={width + 2 * PAD}
          height={height}
          viewBox={`0 0 ${width + 2 * PAD} ${height}`}
          aria-hidden="true"
        >
          {model.nodes.map((node, i) => {
            if (i === 0 || !node) return null;
            const a = at(i);
            const b = at(parentIndex(i));
            const isLit = lit !== null && lit.includes(i) && lit.includes(parentIndex(i));
            return (
              <line
                // Edges are positional: edge i joins node i to its parent.
                key={`e${i}`}
                className={`viz-heap__edge${isLit ? " viz-heap__edge--lit" : ""}`}
                x1={a.cx}
                y1={a.cy}
                x2={b.cx}
                y2={b.cy}
              />
            );
          })}
          {model.nodes.map((node, i) => {
            const { cx, cy } = at(i);
            // Node position is the identity; values move between slots.
            return node ? (
              <NodeView key={`n${i}`} node={node} cx={cx} cy={cy} />
            ) : (
              <circle key={`n${i}`} className="viz-heap__empty" cx={cx} cy={cy} r={R} />
            );
          })}
          {model.leaving && (
            <g className="viz-heap__leaving">
              <line
                className="viz-heap__out"
                x1={at(0).cx + R}
                y1={at(0).cy}
                x2={at(0).cx + PAD - R}
                y2={at(0).cy}
              />
              <NodeView node={model.leaving} cx={at(0).cx + PAD} cy={at(0).cy} ghost />
            </g>
          )}
        </svg>
        {model.array && <ArrayRows model={model.array} />}
      </FitBox>
    </div>
  );
}
