import type { Rich } from "../core/rich";
import type { ShapeModel } from "../core/shapes";
import type { Experiment, Outcome, VarRow } from "../core/types";
import type { Op } from "./trace";

// Chip order: easier first.
export const HASH_IDS = ["chaining", "linear", "quadratic", "double", "resize"] as const;
export type HashId = (typeof HASH_IDS)[number];

export const MIN_SIZE = 4;
export const MAX_SIZE = 12;
export const DEFAULT_SIZE = 8;
export const MAX_TOKENS = 12;
export const KEY_MAX = 99;
export const THRESHOLDS = ["0.5", "0.75", "0.9"] as const;
export const DEFAULT_THRESHOLD = 0.75;

export interface HashInput {
  algo: HashId;
  size: number;
  threshold: number;
  ops: Op[];
  // The effective tokens, shown back in the sequence field.
  tokens: string[];
}

export interface HashStep {
  badge: string;
  caption: Rich;
  model: ShapeModel;
  // The corner metric: probes, or nodes walked for chaining.
  metric: string;
  outcome: Outcome;
  vars: VarRow[];
  path: number[];
}

export interface HashDef {
  id: HashId;
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  articleHref: string;
  metricLabel: string;
  steps(input: HashInput): HashStep[];
}
