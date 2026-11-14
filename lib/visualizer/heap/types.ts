import type { Rich } from "../core/rich";
import type { ShapeModel } from "../core/shapes";
import type { Experiment, Outcome, VarRow } from "../core/types";
import type { Order } from "./engine";

// Chip order: easier first.
export const HEAP_IDS = ["insert", "extract", "build", "heapsort", "topk"] as const;
export type HeapId = (typeof HEAP_IDS)[number];

export const MIN_VALUES = 2;
export const MAX_VALUES = 12;
export const MIN_K = 2;
export const MAX_K = 5;
export const VALUE_MIN = 1;
export const VALUE_MAX = 99;

export interface HeapInput {
  op: HeapId;
  order: Order;
  k: number;
  values: number[];
}

export interface HeapStep {
  badge: string;
  caption: Rich;
  model: ShapeModel;
  // The corner metric: the main counter for this step.
  metric: string;
  outcome: Outcome;
  vars: VarRow[];
  path: number[];
}

export interface HeapDef {
  id: HeapId;
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  articleHref: string;
  steps(input: HeapInput): HeapStep[];
}
