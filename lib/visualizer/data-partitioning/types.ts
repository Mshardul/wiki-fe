// Chip order: easier first.
export const SCHEME_IDS = ["mod-n", "range", "ring", "directory", "rendezvous"] as const;
export type SchemeId = (typeof SCHEME_IDS)[number];

export const NODE_LETTERS: readonly string[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
export const KEY_SPACE = 100;
export const MAX_KEY = KEY_SPACE - 1;
export const MIN_NODES = 1;
export const MAX_NODES = 6;
export const MAX_EVENTS = 4;
export const MAX_KEYS = 12;
export const DEFAULT_KEY_COUNT = 8;
export const HOT_WEIGHT = 5;
export const VNODE_CHOICES = [1, 2, 4, 8] as const;
export const DEFAULT_VNODES = 4;
export const WORKLOADS = ["random", "sequential", "hot"] as const;
export type Workload = (typeof WORKLOADS)[number];

export interface KeyItem {
  key: number;
  hot: boolean;
}
export const weightOf = (item: KeyItem): number => (item.hot ? HOT_WEIGHT : 1);

export type Applied = { kind: "add"; letter: string } | { kind: "remove"; letter: string };

// One range of raw key values owned by one node, used by Range.
export interface RangeSeg {
  node: string;
  lo: number;
  hi: number;
}
export interface SchemeState {
  // Alive nodes in letter order.
  nodes: string[];
  vnodes: number;
  ranges: RangeSeg[];
}

// A scheme decides where a new key goes and where every key goes after a node event.
export interface Scheme {
  init(nodes: string[], vnodes: number): SchemeState;
  place(state: SchemeState, items: KeyItem[], index: number, owners: (string | null)[]): string;
  apply(
    state: SchemeState,
    event: Applied,
    items: KeyItem[],
    owners: string[],
  ): { state: SchemeState; owners: string[] };
}

export type Phase = "place" | "event" | "recheck";
export type StepOutcome = "neutral" | "good" | "bad";

export interface PartEvent {
  phase: Phase;
  badge: string;
  // Which node event this step belongs to, null while placing.
  eventIndex: number | null;
  // The key being placed or re-checked, null on an event step.
  keyIndex: number | null;
  // Alive nodes after the latest event.
  nodes: string[];
  joining: string | null;
  leaving: string | null;
  // Owner shown for each key now; null until the key is placed.
  owners: (string | null)[];
  // True for keys not yet re-checked in the latest event.
  pending: boolean[];
  // On a re-check step, where the key was before.
  fromOwner: string | null;
  outcome: StepOutcome;
  // Keys moved so far in the latest event.
  moved: number;
  // The fewest keys any scheme could have moved for the latest event, null before the first.
  fewest: number | null;
  state: SchemeState;
}

export interface PartitionInput {
  scheme: SchemeId;
  start: number;
  vnodes: number;
  keys: KeyItem[];
  // Raw event tokens: "+" or "-X".
  events: string[];
}
