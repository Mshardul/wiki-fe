import type { Rich } from "../core/rich";
import type { ShapeModel } from "../core/shapes";
import type { Experiment, Outcome, VarRow } from "../core/types";
import type { Coords, PresetId } from "./graphs";
import type { GraphData } from "./trace";

// Chip order: easier first.
export const GRAPH_IDS = ["bfs", "dfs", "dijkstra", "topo", "bipartite"] as const;
export type GraphId = (typeof GRAPH_IDS)[number];

export const NODE_CHIPS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export interface GraphInput {
  algo: GraphId;
  preset: PresetId;
  start: string;
  seed: number;
}

export interface GraphStep {
  badge: string;
  caption: Rich;
  model: ShapeModel;
  // The corner metric.
  metric: string;
  outcome: Outcome;
  vars: VarRow[];
  path: number[];
}

// Another graph to run on, used by the Revision cards; compact keeps only the main working structure.
export interface StepOptions {
  world?: { data: GraphData; coords: Coords };
  compact?: boolean;
}

export interface GraphDef {
  id: GraphId;
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  articleHref: string;
  metricLabel: string;
  steps(input: GraphInput, options?: StepOptions): GraphStep[];
}
