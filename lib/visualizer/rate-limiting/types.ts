import type { Experiment } from "../core/types";

export const ALGORITHM_IDS = [
  "fixed-window",
  "sliding-log",
  "sliding-counter",
  "token-bucket",
  "leaky-bucket",
] as const;
export type AlgorithmId = (typeof ALGORITHM_IDS)[number];

export const WORKLOADS = ["steady", "burst", "straddle", "idle-burst"] as const;
export type Workload = (typeof WORKLOADS)[number];

export type Pace = 1 | 2;
export const PACES: readonly Pace[] = [1, 2];

export const MIN_LIMIT = 2;
export const MAX_LIMIT = 5;
export const MAX_REQUESTS = 14;
// The widest axis (Limit 5, Pace 2) has 20 ticks.
export const MAX_TICK = 19;
export const MIN_AXIS = 12;

export interface Params {
  limit: number;
  pace: Pace;
  window: number;
}
export const paramsOf = (limit: number, pace: Pace): Params => ({
  limit,
  pace,
  window: limit * pace,
});
export const axisOf = (p: Params, ticks: number[]): number =>
  Math.max(MIN_AXIS, 2 * p.window, (ticks[ticks.length - 1] ?? 0) + 1);

export interface RateInput {
  algorithm: AlgorithmId;
  limit: number;
  pace: Pace;
  workload: Workload;
  seed: number;
  ticks: number[] | null;
}

export interface Decision {
  ok: boolean;
  detail: string;
  // Leaky bucket only: how long this request waits and the tick it leaves.
  wait?: { ticks: number; leave: number };
}

export interface QueuedRequest {
  id: number;
  leave: number;
}

export type Snapshot =
  | { kind: "fixed"; window: number; counts: number[]; rejected: number[] }
  | { kind: "log"; kept: number[] }
  | {
      kind: "counter";
      window: number;
      counts: number[];
      previous: number;
      weight: number;
      current: number;
      // previous × weight + current × window; the estimate is scaled / window.
      scaled: number;
    }
  | {
      kind: "token";
      tokens: number[];
      refilled: number[];
      spent: number | null;
      nextIn: number | null;
    }
  | {
      kind: "leaky";
      queue: QueuedRequest[];
      processed: number;
      dropped: number;
      left: number[];
      leaves: number[];
    };

// begin() catches the limiter up to tick t and clears per-step events; request() then decides one request.
export interface Limiter {
  begin(t: number): string;
  request(t: number, index: number): Decision;
  snapshot(t: number): Snapshot;
}
export type LimiterFactory = (p: Params) => Limiter;

export interface AlgorithmMeta {
  id: AlgorithmId;
  name: string;
  chip: string;
  rule: string;
  // Step-tab lines; {tick} is filled per request.
  lines: string[];
  paths: { ok: number[]; bad: number[] };
  okWord: string;
  failWord: string;
  about: [string, string][];
  tries: Experiment[];
  anchor: string;
  summary: string;
  glossaryTerm: string;
  differs: string;
}
