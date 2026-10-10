export type FlowNodeKind = "client" | "buffer" | "store";
export type FlowStyle = "solid" | "dashed" | "dotted";

export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  label: string;
}
export interface FlowEdge {
  from: string;
  to: string;
  step: number;
  style: FlowStyle;
  label?: string;
}
// Edges with step <= lit are drawn lit; the one equal to lit pulses while the loop is playing.
export interface FlowModel {
  nodes: FlowNode[];
  edges: FlowEdge[];
  lit: number;
}

export const FLOW_W = 300;
export const FLOW_H = 180;
export const FLOW_HALF = 22;
const NODE_Y = 124;
const PAIR_GAP = 26;
const STEM = 22;
const ARC = 40;
const ARC_GAP = 40;

export interface PlacedNode extends FlowNode {
  x: number;
  y: number;
}
export interface PlacedEdge {
  step: number;
  style: FlowStyle;
  label?: string;
  d: string;
  // Badge centre, then the label position and its text anchor.
  bx: number;
  by: number;
  lx: number;
  ly: number;
  la: "middle" | "start";
}

const pairKey = (e: FlowEdge): string => [e.from, e.to].sort().join("|");

export function flowLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
): { nodes: PlacedNode[]; edges: PlacedEdge[] } {
  const placed = nodes.map((n, i) => ({
    ...n,
    x: (FLOW_W * (i + 0.5)) / nodes.length,
    y: NODE_Y,
  }));
  const groups = new Map<string, FlowEdge[]>();
  for (const e of [...edges].sort((a, b) => a.step - b.step)) {
    groups.set(pairKey(e), [...(groups.get(pairKey(e)) ?? []), e]);
  }
  const out: PlacedEdge[] = [];
  for (const e of edges) {
    const ia = placed.findIndex((n) => n.id === e.from);
    const ib = placed.findIndex((n) => n.id === e.to);
    const a = placed[ia];
    const b = placed[ib];
    if (!a || !b) continue;
    const group = groups.get(pairKey(e)) ?? [e];
    const k = group.indexOf(e);
    const dir = Math.sign(b.x - a.x);
    const base = { step: e.step, style: e.style, label: e.label };
    if (Math.abs(ia - ib) === 1) {
      const y = NODE_Y + (k - (group.length - 1) / 2) * PAIR_GAP;
      const sx = a.x + dir * (FLOW_HALF + 4);
      const ex = b.x - dir * (FLOW_HALF + 6);
      const mx = (sx + ex) / 2;
      out.push({
        ...base,
        d: `M ${sx} ${y} L ${ex} ${y}`,
        bx: mx,
        by: y,
        lx: mx,
        ly: y - 11,
        la: "middle",
      });
    } else {
      const top = NODE_Y - (FLOW_HALF + 2);
      const y0 = top - STEM;
      const ctrl = y0 - (ARC + k * ARC_GAP);
      const mid = (a.x + b.x) / 2;
      const ym = 0.5 * y0 + 0.5 * ctrl;
      out.push({
        ...base,
        d: `M ${a.x} ${top} L ${a.x} ${y0} Q ${mid} ${ctrl} ${b.x} ${y0} L ${b.x} ${top}`,
        bx: mid,
        by: ym,
        lx: mid + 11,
        ly: ym - 7,
        la: "start",
      });
    }
  }
  return { nodes: placed, edges: out };
}
