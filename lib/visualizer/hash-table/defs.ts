import type { Outcome } from "../core/types";
import { chainRun } from "./chain";
import { COPY } from "./copy";
import { openRun } from "./open";
import { resizeRun } from "./resize";
import type { Op, OpenEvent, Scheme } from "./trace";
import { HASH_IDS, type HashDef, type HashId, type HashInput, type HashStep } from "./types";
import {
  chainCtx,
  chainMetricOf,
  chainModelOf,
  chainVarsOf,
  openMetricOf,
  openModelOf,
  openVarsOf,
  type ViewCtx,
} from "./view";

const GOOD = new Set(["Start", "Place", "Mark", "Unlink", "Grow", "Move", "Switch", "Done"]);
const outcomeOf = (badge: string): Outcome => (GOOD.has(badge) ? "good" : "bad");

const OPEN_PATH: Record<string, number[]> = {
  Hash: [0],
  Move: [2],
  Probe: [1],
  Hop: [1],
  Place: [2],
  Found: [2],
  Mark: [2],
  "Not found": [2],
  Stuck: [2],
};
const CHAIN_PATH: Record<string, number[]> = {
  Hash: [0],
  Walk: [1],
  Place: [2],
  Found: [2],
  Unlink: [2],
  "Not found": [2],
};

function resizePath(ev: OpenEvent): number[] {
  if (ev.badge === "Start" || ev.badge === "Done" || ev.badge === "Switch") return [];
  if (ev.badge === "Grow") return [1];
  return ev.old ? [2] : [0];
}

function openSteps(
  events: OpenEvent[],
  ctx: ViewCtx,
  path: (ev: OpenEvent) => number[] = (ev) => OPEN_PATH[ev.badge] ?? [],
): HashStep[] {
  return events.map((ev) => ({
    badge: ev.badge,
    caption: ev.caption,
    model: openModelOf(ev, ctx),
    metric: openMetricOf(ev),
    outcome: outcomeOf(ev.badge),
    vars: openVarsOf(ev, ctx),
    path: path(ev),
  }));
}

const probing =
  (scheme: Scheme) =>
  (input: HashInput): HashStep[] =>
    openSteps(openRun(input.ops, scheme, input.size), {
      scheme,
      maxChain: 1,
      threshold: null,
      meterMax: 1,
    });

const STEPS: Record<HashId, (input: HashInput) => HashStep[]> = {
  chaining: (input) => {
    const events = chainRun(input.ops, input.size);
    const ctx = chainCtx(events);
    return events.map((ev) => ({
      badge: ev.badge,
      caption: ev.caption,
      model: chainModelOf(ev, ctx),
      metric: chainMetricOf(ev),
      outcome: outcomeOf(ev.badge),
      vars: chainVarsOf(ev),
      path: CHAIN_PATH[ev.badge] ?? [],
    }));
  },
  linear: probing("linear"),
  quadratic: probing("quadratic"),
  double: probing("double"),
  resize: (input) =>
    openSteps(
      resizeRun(input.ops, input.size, input.threshold),
      { scheme: "linear", maxChain: 1, threshold: input.threshold, meterMax: 1 },
      resizePath,
    ),
};

function defOf(id: HashId): HashDef {
  const { name, chip, rule, lines, about, tries, articleHref, metricLabel } = COPY[id];
  return { id, name, chip, rule, lines, about, tries, articleHref, metricLabel, steps: STEPS[id] };
}

export const DEFS = Object.fromEntries(HASH_IDS.map((id) => [id, defOf(id)])) as Record<
  HashId,
  HashDef
>;

export type { Op };
