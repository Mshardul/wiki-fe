import { runPartition } from "./engine";
import { toKeyItems } from "./keys";
import type { PartEvent, SchemeId } from "./types";

// The default keys of the old design, hand-hashed in the fixtures.
export const DEFAULT_KEYS = ["12", "18", "29", "61", "65", "66", "79", "97"];

export const run = (
  scheme: SchemeId,
  opts: { keys?: string[]; start?: number; vnodes?: number; events?: string[] } = {},
): PartEvent[] =>
  runPartition({
    scheme,
    start: opts.start ?? 3,
    vnodes: opts.vnodes ?? 1,
    keys: toKeyItems(opts.keys ?? DEFAULT_KEYS),
    events: opts.events ?? [],
  });

// Node → keys, in key order, from an owners row.
export function holdings(keys: string[], owners: (string | null)[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  owners.forEach((o, i) => {
    if (o !== null) (out[o] ??= []).push(Number((keys[i] as string).replace("*", "")));
  });
  return out;
}

// The state after the last step of a run.
export const last = (events: PartEvent[]): PartEvent => events[events.length - 1] as PartEvent;

// The state at the end of the place phase.
export const placed = (events: PartEvent[], k: number): PartEvent => events[k - 1] as PartEvent;
