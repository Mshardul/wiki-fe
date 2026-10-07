import type { ShapeModel } from "../core/shapes";
import type { Experiment, VarRow } from "../core/types";

export const POLICY_IDS = ["lru", "fifo", "lfu", "clock"] as const;
export type PolicyId = (typeof POLICY_IDS)[number];

export const PATTERNS = ["hot", "scan", "loop", "uniform"] as const;
export type Pattern = (typeof PATTERNS)[number];

export interface EvictionInput {
  policy: PolicyId;
  capacity: number;
  pattern: Pattern;
  length: number;
  seed: number;
  sequence: string[] | null;
}

// Templates use {key}, {victim} and any names a policy returns in StepOutcome.notes.
export interface PolicyLines {
  check: string;
  hit: string;
  missAny: string;
  evict: string;
  room: string;
  insert: string;
}

export interface PolicyMeta {
  id: PolicyId;
  name: string;
  chip: string;
  rule: string;
  hitCaption: string;
  lines: PolicyLines;
  about: [string, string][];
  tries: Experiment[];
  anchor: string;
}

export interface StepOutcome<S> {
  state: S;
  hit: boolean;
  evicted: string | null;
  notes?: Record<string, string>;
}

export interface PolicyDef<S> extends PolicyMeta {
  init(capacity: number): S;
  step(state: S, key: string, t: number): StepOutcome<S>;
  model(state: S, key: string, hit: boolean, evicted: string | null): ShapeModel;
  vars?(state: S, key: string): VarRow[];
}

export interface LinearState {
  capacity: number;
  order: string[];
}
