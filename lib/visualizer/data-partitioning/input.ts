import { clampInt, type InputValues, SEED_MAX } from "../core/fields";
import { DEFAULT_EVENTS, DEFAULT_KEYS, DEFAULT_START } from "./defaults";
import { parseKeys, resolveEvents, toKeyItems } from "./keys";
import { generateKeys, pickRemoval } from "./trace";
import {
  DEFAULT_VNODES,
  MAX_EVENTS,
  MAX_NODES,
  MIN_NODES,
  NODE_LETTERS,
  type PartitionInput,
  SCHEME_IDS,
  VNODE_CHOICES,
  WORKLOADS,
  type Workload,
} from "./types";

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

// Adds minus removes: how far the events move the node count.
export const netOf = (events: string[]): number =>
  events.reduce((sum, t) => sum + (t.startsWith("+") ? 1 : -1), 0);

const eventsOf = (values: InputValues): string[] =>
  Array.isArray(values.events) ? values.events : DEFAULT_EVENTS;

// The slider reads the count after every event, so the starting count is what is left once they are undone.
export function startOf(values: InputValues): number {
  return (
    clampInt(num(values.nodes, DEFAULT_START + 1), MIN_NODES, MAX_NODES) - netOf(eventsOf(values))
  );
}

export function shapeOf(values: InputValues): { start: number; events: string[] } {
  const events = eventsOf(values);
  const start = startOf(values);
  const fine =
    events.length <= MAX_EVENTS &&
    start >= MIN_NODES &&
    start <= MAX_NODES &&
    resolveEvents(start, events).ok;
  return fine ? { start, events } : { start: DEFAULT_START, events: DEFAULT_EVENTS };
}

// Letters alive after every event so far.
export function aliveAfter(start: number, events: string[]): string[] {
  const resolved = resolveEvents(start, events);
  let alive = NODE_LETTERS.slice(0, start);
  if (!resolved.ok) return alive;
  for (const e of resolved.events) {
    alive = e.kind === "add" ? [...alive, e.letter] : alive.filter((n) => n !== e.letter);
  }
  return alive;
}

const workloadOf = (v: unknown): Workload => WORKLOADS.find((w) => w === v) ?? "random";

function keyTokens(values: InputValues): string[] {
  const seed = clampInt(num(values.seed, 0), 0, SEED_MAX);
  const given = Array.isArray(values.keys) ? values.keys : null;
  if (given && parseKeys(given.join(" ")).ok) return given;
  return values.keys === null || values.keys === undefined
    ? generateKeys(workloadOf(values.workload), seed)
    : DEFAULT_KEYS;
}

export function toPartitionInput(values: InputValues): PartitionInput & { tokens: string[] } {
  const scheme = SCHEME_IDS.find((s) => s === values.scheme) ?? "mod-n";
  const { start, events } = shapeOf(values);
  const vnodes = VNODE_CHOICES.find((n) => String(n) === String(values.vnodes)) ?? DEFAULT_VNODES;
  const tokens = keyTokens(values);
  return { scheme, start, vnodes, keys: toKeyItems(tokens), events, tokens };
}

// The step an event lands on: every placement, then earlier events with their re-checks.
export const eventStep = (keys: number, eventsBefore: number): number =>
  keys + eventsBefore * (1 + keys);

export function addAction(values: InputValues): { values: InputValues; step: number } {
  const input = toPartitionInput(values);
  return {
    values: {
      ...values,
      events: [...input.events, "+"],
      nodes: input.start + netOf(input.events) + 1,
    },
    step: eventStep(input.keys.length, input.events.length),
  };
}

export function removeAction(values: InputValues): { values: InputValues; step: number } {
  const input = toPartitionInput(values);
  const alive = aliveAfter(input.start, input.events);
  const seed = clampInt(num(values.seed, 0), 0, SEED_MAX);
  const pick = pickRemoval(alive, seed, input.events.length);
  return {
    values: {
      ...values,
      events: [...input.events, `-${pick}`],
      nodes: input.start + netOf(input.events) - 1,
    },
    step: eventStep(input.keys.length, input.events.length),
  };
}

// A direct edit of Events keeps the starting count; the slider follows the new final count.
export function linkEvents(values: InputValues, tokens: string[]): InputValues {
  const start = startOf(values);
  return {
    ...values,
    events: tokens,
    nodes: clampInt(start + netOf(tokens), MIN_NODES, MAX_NODES),
  };
}
