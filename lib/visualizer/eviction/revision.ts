import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import type { PolicyEntry } from "./module";
import { POLICY_IDS, type PolicyId } from "./types";

export const MINI_TRACE = "ABCAD".split("");
export const MINI_CAPACITY = 3;

const COPY: Record<PolicyId, { summary: string; glossaryTerm?: string; differs: string }> = {
  fifo: {
    summary:
      "First in, first out: the key that arrived earliest is evicted, whether or not it is still being used.",
    differs:
      "Ignores use entirely. A hit changes nothing, so a hot key can be evicted just for being old.",
  },
  lru: {
    summary: "Least recently used: the key untouched for the longest time is evicted.",
    glossaryTerm: "lru",
    differs:
      "Unlike FIFO, a hit renews a key. Unlike LFU, it remembers only when a key was used, not how often.",
  },
  lfu: {
    summary:
      "Least frequently used: the key with the fewest hits is evicted; ties go to the one used longest ago.",
    differs:
      "Remembers how often, not when, so popular keys survive a scan, but a new key starts at the bottom and can be evicted before it proves itself.",
  },
  clock: {
    summary:
      "CLOCK (second chance): a hand sweeps a ring of slots; a slot used since the last pass is spared once, and the first unused one is evicted.",
    differs:
      "An LRU approximation that moves nothing on a hit; it only sets one bit, so hits are cheap.",
  },
};

export function evictionRevision(policies: Record<PolicyId, PolicyEntry>): RevisionCard[] {
  return POLICY_IDS.map((id) => {
    const entry = policies[id];
    const frames = entry.run(MINI_CAPACITY, MINI_TRACE);
    return {
      id,
      name: entry.meta.name,
      steps: frames.length,
      render: (lit) => {
        if (lit <= 0) return { kind: "shape", model: entry.empty(MINI_CAPACITY) };
        const model = frames[Math.min(lit, frames.length) - 1]?.model;
        if (!model) throw new Error(`no frame for ${id}`);
        return { kind: "shape", model };
      },
      stepsText: frames.map(
        (f) => `Request ${f.label}: ${f.badge.toLowerCase()}. ${richText(f.caption)}`,
      ),
      ...COPY[id],
    };
  });
}
