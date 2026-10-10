import type { Rich } from "../core/rich";
import type { Hop } from "../core/shapes";
import type { Experiment, Outcome } from "../core/types";

export const STRATEGY_IDS = [
  "cache-aside",
  "read-through",
  "write-through",
  "write-behind",
  "write-around",
  "refresh-ahead",
] as const;
export type StrategyId = (typeof STRATEGY_IDS)[number];

export const WORKLOADS = ["read", "mixed", "write", "race", "crash"] as const;
export type Workload = (typeof WORKLOADS)[number];

export const KEYS = "ABCDE";

export type LaneId = "app" | "cache" | "db";
export type OpKind = "R" | "W" | "X" | "!";
export interface Op {
  kind: OpKind;
  key: string;
}

export interface Params {
  lifetime: number;
  flushEvery: number;
}

export interface Entry {
  version: number;
  born: number;
}

// One request's view of the system; strategies mutate a private copy and the driver keeps the history.
export interface World {
  tick: number;
  db: Record<string, number>;
  cache: Record<string, Entry>;
  buffer: Record<string, number>;
  stale: number;
  lost: number;
  dbWrites: number;
}

export interface Step {
  hops: Hop[];
  outcome: Outcome;
  badge: string;
  caption: Rich;
  path: number[];
  cost: number;
  note: Rich;
  crashed?: boolean;
  lostKeys?: string[];
}

export interface CachingInput {
  strategy: StrategyId;
  keys: number;
  length: number;
  lifetime: number;
  flushEvery: number;
  workload: Workload;
  seed: number;
  sequence: string[] | null;
}

// Step-line indexes: 0 ask the cache, 1 hit, 2 miss, 3 write, 4 background work.
export interface StrategyMeta {
  id: StrategyId;
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  anchor: string;
  usesLifetime: boolean;
  usesFlush: boolean;
  metricLabel: string;
}

export interface StrategyDef extends StrategyMeta {
  step(w: World, op: Op, p: Params): Step;
}
