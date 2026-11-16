export const POLICY_IDS = ["round-robin", "weighted", "least-connections", "ip-hash"] as const;
export type PolicyId = (typeof POLICY_IDS)[number];

export const MIN_SERVERS = 2;
export const MAX_SERVERS = 4;
export const DEFAULT_SERVERS = 3;
export const MIN_REQUESTS = 2;
export const MAX_REQUESTS = 10;
export const MAX_TICKS = 9;
export const LONG_AT = 5;
export const GAP = 1;
// The server fails just before this request (1-based) arrives.
export const FAIL_BEFORE = 5;

export const WEIGHTS: readonly number[] = [3, 2, 1, 1];
export const CLIENTS: readonly number[] = [4, 7, 4, 9, 7, 4, 9, 7, 4, 9];
export const clientOf = (request: number): number =>
  CLIENTS[(request - 1) % CLIENTS.length] as number;
export const addressOf = (client: number): string => `10.0.0.${client}`;

export const WORKLOADS = ["uneven", "even"] as const;
export type Workload = (typeof WORKLOADS)[number];

export interface LbInput {
  policy: PolicyId;
  servers: number;
  durations: number[];
  failure: number | null;
}

export type Phase = "decide" | "land" | "finish" | "fail";
export type StepOutcome = "neutral" | "good" | "bad";

export interface Flight {
  request: number;
  server: number;
  end: number;
  total: number;
}

export type Pick =
  | { kind: "turn"; server: number }
  | { kind: "credits"; server: number; credits: number[]; refilled: boolean }
  | { kind: "counts"; server: number; counts: number[] }
  | { kind: "hash"; server: number; client: number; alive: number[]; remainder: number };

export interface PolicyState {
  next: number;
  credits: number[];
}

export interface LbStep {
  phase: Phase;
  badge: string;
  tick: number;
  request: number | null;
  server: number | null;
  from: number | null;
  up: boolean[];
  flights: Flight[];
  arriving: Flight | null;
  pick: Pick | null;
  state: PolicyState;
  routed: number;
  outcome: StepOutcome;
}
