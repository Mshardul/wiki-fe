import type { Rich } from "../core/rich";

export type Scheme = "linear" | "quadratic" | "double";
export type OpKind = "insert" | "lookup" | "delete";

export interface Op {
  kind: OpKind;
  key: number;
}

export type Cell =
  | { state: "empty" }
  | { state: "full"; key: number }
  | { state: "marker"; key: number };

export type OpenBadge =
  | "Start"
  | "Hash"
  | "Probe"
  | "Hop"
  | "Place"
  | "Found"
  | "Mark"
  | "Not found"
  | "Stuck"
  | "Grow"
  | "Move"
  | "Switch"
  | "Done";

export interface OpenEvent {
  badge: OpenBadge;
  caption: Rich;
  // The live table after the step.
  cells: Cell[];
  // The table being rehashed from, while a resize is under way.
  old: Cell[] | null;
  // The old slot being read during a rehash move.
  oldAt: number | null;
  key: number | null;
  home: number | null;
  // The second hash, for double hashing only.
  second: number | null;
  // The slot examined or written this step (on Hop, the slot being moved to).
  slot: number | null;
  // Slots of this walk in order, repeats kept; on Hop it already holds the slot being moved to.
  tried: number[];
  // Probes made so far in this walk.
  probes: number;
  placed: number | null;
  // Full plus marker slots.
  used: number;
}

export type ChainBadge =
  | "Start"
  | "Hash"
  | "Walk"
  | "Place"
  | "Found"
  | "Unlink"
  | "Not found"
  | "Done";

export interface ChainEvent {
  badge: ChainBadge;
  caption: Rich;
  chains: number[][];
  key: number | null;
  home: number | null;
  // Index in the home chain of the item being visited.
  walking: number | null;
  // Items visited so far in this op.
  walked: number;
  placed: number | null;
}
