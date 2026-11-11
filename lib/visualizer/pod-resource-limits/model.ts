import type { ResourceCardRow, ResourceGaugesModel } from "@/lib/visualizer/core/shapes";
import type { PodLimitsFrame } from "./types";

const ON = (ids: string[] | undefined) => new Set(ids ?? []);

function cards(rows: ResourceCardRow[] | undefined, active: Set<string>): ResourceCardRow[] {
  return (rows ?? []).map((c) => ({ ...c, on: active.has(c.n) }));
}

export function frameModel(frame: PodLimitsFrame): ResourceGaugesModel {
  const active = ON(frame.on);
  return {
    kind: "resource-gauges",
    badge: frame.badge ?? "",
    badgeBad: frame.bad,
    term: frame.term,
    nodesTitle: frame.nodesTitle,
    nodes: cards(frame.nodes, active),
    containers: cards(frame.ctrs, active),
    timeline: frame.tl,
    sum: frame.sum ?? [],
  };
}
