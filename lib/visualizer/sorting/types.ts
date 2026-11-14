import type { Rich } from "../core/rich";
import type { ArrayModel, HeapModel } from "../core/shapes";
import type { Experiment, Outcome, VarRow } from "../core/types";

// Chip order: easier first.
export const SORT_IDS = [
  "insertion",
  "selection",
  "merge",
  "quick",
  "heap",
  "counting",
  "radix",
  "bucket",
] as const;
export type SortId = (typeof SORT_IDS)[number];

export const PRESETS = ["random", "nearly-sorted", "reversed", "duplicates"] as const;
export type Preset = (typeof PRESETS)[number];

export const MIN_SIZE = 4;
export const MAX_SIZE = 12;

export interface Item {
  value: number;
  // Identity tag such as "a" on repeated values, set only when stability is on.
  tag?: string;
}

export interface SortInput {
  algo: SortId;
  preset: Preset;
  size: number;
  seed: number;
  stable: boolean;
  // A typed or hand-picked sequence; null means generate from the preset.
  values: number[] | null;
}

export interface Counter {
  value: string;
  label: string;
}

export interface SortStep {
  badge: string;
  caption: Rich;
  array: ArrayModel;
  // Drawn instead of the array when set (heap sort's tree, which carries its own array).
  picture?: HeapModel;
  counters: Counter[];
  outcome: Outcome;
  vars: VarRow[];
  path: number[];
}

export interface SortDef {
  id: SortId;
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  articleHref: string;
  steps(items: Item[]): SortStep[];
}
