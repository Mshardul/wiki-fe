import type { PolicyDef } from "../types";

export interface LfuState {
  capacity: number;
  slots: string[];
  counts: Record<string, number>;
  last: Record<string, number>;
}

const omit = (rec: Record<string, number>, key: string): Record<string, number> =>
  Object.fromEntries(Object.entries(rec).filter(([k]) => k !== key));

// Lowest count wins; ties go to the key used longest ago.
function victim(s: LfuState): string | null {
  let best: string | null = null;
  for (const k of s.slots) {
    if (best === null) {
      best = k;
      continue;
    }
    const c = s.counts[k] ?? 0;
    const bc = s.counts[best] ?? 0;
    if (c < bc || (c === bc && (s.last[k] ?? 0) < (s.last[best] ?? 0))) best = k;
  }
  return best;
}

export const lfu: PolicyDef<LfuState> = {
  id: "lfu",
  name: "LFU",
  chip: "Ranking",
  rule: "Throw out whatever is used least often.",
  hitCaption: "count goes up",
  lines: {
    check: "Is {key} in the cache?",
    hit: "Yes → hit. Add 1 to {key}'s count.",
    missAny: "No → miss. If full, remove the lowest count.",
    evict: "No → miss. Full → remove {victim} (lowest count).",
    room: "No → miss. Space left, nothing removed.",
    insert: "Add {key} with count 1.",
  },
  about: [
    ["Cost", "O(1) with frequency buckets (O(log n) with a heap)"],
    ["Wins", "popular keys survive one-off scans"],
    ["Loses", "old favourites linger; new keys go before they can prove themselves"],
    ["Seen in", "CDNs, Caffeine's W-TinyLFU (a refined variant)"],
  ],
  tries: [
    {
      title: "Survives the scan",
      blurb: "Hot keys build up counts, so a sweep can't push them out.",
      patch: { pattern: "scan", capacity: 4, sequence: null },
    },
    {
      title: "New keys starve",
      blurb: "Uniform traffic: fresh keys lose to anything with a higher count.",
      patch: { pattern: "uniform", capacity: 4, sequence: null },
    },
  ],
  anchor: "lfu-least-frequently-used",
  init: (capacity) => ({ capacity, slots: [], counts: {}, last: {} }),
  step(state, key, t) {
    const hit = state.slots.includes(key);
    const slots = [...state.slots];
    let counts = { ...state.counts };
    let last = { ...state.last };
    let evicted: string | null = null;
    if (hit) {
      counts[key] = (counts[key] ?? 0) + 1;
    } else {
      if (slots.length >= state.capacity) {
        evicted = victim(state);
        const at = evicted === null ? -1 : slots.indexOf(evicted);
        if (evicted !== null && at >= 0) {
          slots[at] = key;
          counts = omit(counts, evicted);
          last = omit(last, evicted);
        }
      } else {
        slots.push(key);
      }
      counts[key] = 1;
    }
    last[key] = t;
    return { state: { capacity: state.capacity, slots, counts, last }, hit, evicted };
  },
  model(state, key, hit, evicted) {
    const full = state.slots.length >= state.capacity;
    // Most-used first, ties by most recent: the last row is exactly victim().
    const rows = [...state.slots]
      .sort(
        (a, b) =>
          (state.counts[b] ?? 0) - (state.counts[a] ?? 0) ||
          (state.last[b] ?? 0) - (state.last[a] ?? 0),
      )
      .map((k) => ({ key: k, count: state.counts[k] ?? 0 }));
    return {
      kind: "ranking",
      rows,
      capacity: state.capacity,
      next: full ? victim(state) : null,
      active: key,
      tone: hit ? "existing" : "new",
      removed: evicted,
    };
  },
  vars(state, key) {
    const lowest = Math.min(...state.slots.map((k) => state.counts[k] ?? 0));
    return [
      { name: "uses of key", value: String(state.counts[key] ?? 0) },
      { name: "lowest uses", value: String(lowest) },
    ];
  },
};
