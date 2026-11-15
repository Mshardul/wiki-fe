import { resolveEvents } from "./keys";
import { SCHEMES } from "./schemes";
import {
  NODE_LETTERS,
  type PartEvent,
  type PartitionInput,
  type SchemeState,
  type StepOutcome,
} from "./types";

interface Frame {
  phase: PartEvent["phase"];
  badge: string;
  eventIndex: number | null;
  keyIndex: number | null;
  owners: (string | null)[];
  pending: boolean[];
  fromOwner?: string | null;
  outcome: StepOutcome;
  moved: number;
  fewest: number | null;
}

// Place every key, then per node event one event step and one re-check step per key.
export function runPartition(input: PartitionInput): PartEvent[] {
  const scheme = SCHEMES[input.scheme];
  const items = input.keys;
  const resolved = resolveEvents(input.start, input.events);
  const events = resolved.ok ? resolved.events : [];
  let state: SchemeState = scheme.init(NODE_LETTERS.slice(0, input.start), input.vnodes);
  let joining: string | null = null;
  let leaving: string | null = null;
  const out: PartEvent[] = [];
  const push = (f: Frame) =>
    out.push({
      ...f,
      nodes: state.nodes,
      joining,
      leaving,
      fromOwner: f.fromOwner ?? null,
      state,
    });

  let owners: (string | null)[] = items.map(() => null);
  const none = items.map(() => false);
  items.forEach((_, i) => {
    owners = owners.map((o, j) => (j === i ? scheme.place(state, items, i, owners) : o));
    push({
      phase: "place",
      badge: "Place",
      eventIndex: null,
      keyIndex: i,
      owners,
      pending: none,
      outcome: "neutral",
      moved: 0,
      fewest: null,
    });
  });

  events.forEach((ev, e) => {
    const before = owners as string[];
    const next = scheme.apply(state, ev, items, before);
    state = next.state;
    joining = ev.kind === "add" ? ev.letter : null;
    leaving = ev.kind === "remove" ? ev.letter : null;
    const fewest =
      ev.kind === "add"
        ? Math.round(items.length / state.nodes.length)
        : before.filter((o) => o === ev.letter).length;
    push({
      phase: "event",
      badge: ev.kind === "add" ? "Add" : "Remove",
      eventIndex: e,
      keyIndex: null,
      owners: before,
      pending: items.map(() => true),
      outcome: "neutral",
      moved: 0,
      fewest,
    });
    let moved = 0;
    items.forEach((_, i) => {
      const shown = before.map((o, j) => (j <= i ? (next.owners[j] as string) : o));
      const goes = next.owners[i] !== before[i];
      if (goes) moved += 1;
      push({
        phase: "recheck",
        badge: goes ? "Moves" : "Stays",
        eventIndex: e,
        keyIndex: i,
        owners: shown,
        pending: items.map((__, j) => j > i),
        fromOwner: before[i],
        outcome: goes ? "bad" : "good",
        moved,
        fewest,
      });
    });
    owners = next.owners;
    joining = null;
    leaving = null;
  });
  return out;
}
