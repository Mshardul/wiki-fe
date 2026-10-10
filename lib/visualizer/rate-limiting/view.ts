import type {
  LinearModel,
  ShapeModel,
  TimelineBand,
  TimelineMark,
  TimelineModel,
  TimelineRow,
  TimelineSpan,
} from "../core/shapes";
import { ALGORITHM_META } from "./copy";
import { initialSnapshot, passTicks, peakIn, type Step } from "./engine";
import { formatEstimate } from "./format";
import { type AlgorithmId, axisOf, type Params, type Snapshot } from "./types";

const MAX_STACK = 4;
const LANES: Record<AlgorithmId, number> = {
  "fixed-window": 1,
  "sliding-log": 1,
  "sliding-counter": 2,
  "token-bucket": 1,
  "leaky-bucket": 0,
};

export interface ViewContext {
  id: AlgorithmId;
  params: Params;
  axis: number;
  steps: Step[];
  initial: Snapshot;
  stack: number;
  compact: boolean;
}

export function makeContext(
  id: AlgorithmId,
  params: Params,
  ticks: number[],
  steps: Step[],
  compact: boolean,
): ViewContext {
  const pile = new Map<number, number>();
  for (const t of ticks) pile.set(t, (pile.get(t) ?? 0) + 1);
  return {
    id,
    params,
    axis: axisOf(params, ticks),
    steps,
    initial: initialSnapshot(id, params),
    stack: Math.min(MAX_STACK, Math.max(1, ...pile.values())),
    compact,
  };
}

function snapOf<K extends Snapshot["kind"]>(s: Snapshot, kind: K): Extract<Snapshot, { kind: K }> {
  if (s.kind !== kind) throw new Error(`expected a ${kind} snapshot, got ${s.kind}`);
  return s as Extract<Snapshot, { kind: K }>;
}

// i is the step index; -1 is the empty start state.
const snapAt = (c: ViewContext, i: number): Snapshot => c.steps[i]?.after ?? c.initial;
const nowAt = (c: ViewContext, i: number): number => c.steps[i]?.tick ?? 0;

function arrivalMarks(c: ViewContext, i: number, aged?: (s: Step) => boolean): TimelineMark[] {
  const meta = ALGORITHM_META[c.id];
  return c.steps.slice(0, i + 1).map((s): TimelineMark => {
    let mark: TimelineMark;
    if (!s.ok) mark = { at: s.tick, tone: "bad", title: meta.failWord };
    else if (aged?.(s)) mark = { at: s.tick, tone: "faded", title: "aged out" };
    else mark = { at: s.tick, tone: "good", title: meta.okWord };
    return s.index === i ? { ...mark, current: true } : mark;
  });
}

function timeline(
  c: ViewContext,
  i: number,
  parts: Pick<TimelineModel, "rows"> &
    Partial<Pick<TimelineModel, "bands" | "spans" | "boundaries">>,
): TimelineModel {
  return {
    kind: "timeline",
    ticks: c.axis,
    now: nowAt(c, i),
    stack: c.stack,
    lanes: LANES[c.id],
    bands: [],
    spans: [],
    boundaries: [],
    ...parts,
  };
}

function alertSpans(c: ViewContext, i: number): TimelineSpan[] {
  if (i < 0) return [];
  const p = peakIn(passTicks(c.id, c.steps, i), c.params.window);
  if (p.best <= c.params.limit) return [];
  const width = p.to - p.from + 1;
  return [
    {
      from: p.from,
      to: p.to,
      label: `${p.best} allowed in ${width} ticks`,
      short: `${p.best} in ${width}`,
      style: "alert",
    },
  ];
}

function windowBands(
  c: ViewContext,
  text: (k: number) => { label: string; short: string },
): TimelineBand[] {
  const w = c.params.window;
  return Array.from({ length: Math.ceil(c.axis / w) }, (_, k) => ({
    from: k * w,
    to: Math.min(c.axis - 1, (k + 1) * w - 1),
    ...text(k),
  }));
}

const windowBoundaries = (c: ViewContext): number[] =>
  Array.from(
    { length: Math.ceil(c.axis / c.params.window) - 1 },
    (_, k) => (k + 1) * c.params.window,
  );

function fixedView(c: ViewContext, i: number): TimelineModel {
  const snap = snapOf(snapAt(c, i), "fixed");
  const { limit } = c.params;
  return timeline(c, i, {
    rows: [{ label: "", marks: arrivalMarks(c, i) }],
    bands: windowBands(c, (k) => {
      const used = snap.counts[k] ?? 0;
      return {
        label: `window ${k} · ${used}/${limit}${used >= limit ? " full" : ""}`,
        short: `${used}/${limit}`,
      };
    }),
    boundaries: windowBoundaries(c),
    spans: alertSpans(c, i),
  });
}

function counterView(c: ViewContext, i: number): TimelineModel {
  const snap = snapOf(snapAt(c, i), "counter");
  const { window: w } = c.params;
  const now = nowAt(c, i);
  const spans: TimelineSpan[] = [];
  if (i >= 0) {
    const from = Math.max(0, now - w + 1);
    const est = formatEstimate(snap.scaled, w);
    spans.push({
      from,
      to: now,
      label: `last ${w} ticks · estimate ${est}`,
      short: `est ${est}`,
      style: "outline",
    });
    if (snap.window > 0) {
      const overlapFrom = Math.max(from, (snap.window - 1) * w);
      const overlapTo = snap.window * w - 1;
      if (overlapTo >= overlapFrom) {
        spans.push({ from: overlapFrom, to: overlapTo, label: "", style: "hatch" });
      }
    }
    spans.push(...alertSpans(c, i));
  }
  return timeline(c, i, {
    rows: [{ label: "", marks: arrivalMarks(c, i) }],
    bands: windowBands(c, (k) => {
      const count = snap.counts[k] ?? 0;
      return i >= 0 && snap.window > 0 && k === snap.window - 1
        ? {
            label: `window ${k} · ${count} × ${snap.weight}/${w}`,
            short: `${count}×${snap.weight}/${w}`,
          }
        : { label: `window ${k} · ${count}`, short: String(count) };
    }),
    boundaries: windowBoundaries(c),
    spans,
  });
}

// Repeated ticks get a suffix so every entry in the list has a unique key.
function tickLabels(ticks: number[]): string[] {
  const seen = new Map<number, number>();
  return ticks.map((t) => {
    const n = (seen.get(t) ?? 0) + 1;
    seen.set(t, n);
    return n === 1 ? `t${t}` : `t${t}·${n}`;
  });
}

function logView(c: ViewContext, i: number): ShapeModel {
  const snap = snapOf(snapAt(c, i), "log");
  const { window: w, limit } = c.params;
  const now = nowAt(c, i);
  const spans: TimelineSpan[] =
    i < 0
      ? []
      : [
          {
            from: Math.max(0, now - w + 1),
            to: now,
            label: `last ${w} ticks · kept ${snap.kept.length}/${limit}`,
            short: `kept ${snap.kept.length}/${limit}`,
            style: "outline",
          },
        ];
  const time = timeline(c, i, {
    rows: [{ label: "", marks: arrivalMarks(c, i, (s) => s.tick <= now - w) }],
    spans,
  });
  const items = tickLabels(snap.kept).reverse();
  const added = c.steps[i]?.ok === true;
  const list: LinearModel = {
    kind: "linear",
    items,
    capacity: limit,
    next: items[items.length - 1] ?? null,
    active: added ? (items[0] ?? null) : null,
    tone: added ? "new" : null,
    removed: null,
    labels: { entry: "newest", exit: "oldest ages out" },
    defaultAxis: "horizontal",
  };
  return { kind: "composite", parts: [time, list] };
}

function tokenView(c: ViewContext, i: number): ShapeModel {
  const snap = snapOf(snapAt(c, i), "token");
  const items = [...snap.tokens].reverse().map((id) => `T${id}`);
  const newest = snap.refilled[snap.refilled.length - 1];
  const refilled = newest === undefined ? null : `T${newest}`;
  const active = refilled !== null && items.includes(refilled) ? refilled : null;
  const entry =
    snap.nextIn === null
      ? "bucket full"
      : `next token in ${snap.nextIn} tick${snap.nextIn === 1 ? "" : "s"}`;
  const pile: LinearModel = {
    kind: "linear",
    items,
    capacity: c.params.limit,
    next: items[items.length - 1] ?? null,
    active,
    tone: active ? "new" : null,
    removed: i >= 0 && snap.spent !== null ? `T${snap.spent}` : null,
    labels: { entry, exit: "spent" },
    defaultAxis: "horizontal",
  };
  const strip = timeline(c, i, {
    rows: [{ label: "", marks: arrivalMarks(c, i) }],
    spans: alertSpans(c, i),
  });
  return { kind: "composite", parts: [pile, strip] };
}

function leakyView(c: ViewContext, i: number): ShapeModel {
  const snap = snapOf(snapAt(c, i), "leaky");
  const now = nowAt(c, i);
  const { limit, pace } = c.params;
  const items = [...snap.queue].reverse().map((q) => `#${q.id}`);
  const step = c.steps[i];
  const joined = step?.ok === true ? `#${step.index + 1}` : null;
  const lastLeft = snap.left[snap.left.length - 1];
  const queue: LinearModel = {
    kind: "linear",
    items,
    capacity: limit,
    next: items[items.length - 1] ?? null,
    active: joined !== null && items.includes(joined) ? joined : null,
    tone: joined !== null ? "new" : null,
    removed: lastLeft === undefined ? null : `#${lastLeft}`,
    labels: { entry: "arrive", exit: `leave every ${pace} tick${pace === 1 ? "" : "s"}` },
    defaultAxis: "horizontal",
  };
  const leaves: TimelineMark[] = snap.leaves
    .filter((t) => t < c.axis)
    .map(
      (t): TimelineMark =>
        t <= now
          ? { at: t, tone: "good", title: "left" }
          : { at: t, tone: "faded", title: "scheduled" },
    );
  const rows: TimelineRow[] = [
    { label: "arrive", marks: arrivalMarks(c, i) },
    { label: "leave", marks: leaves },
  ];
  const time = timeline(c, i, { rows });
  return { kind: "composite", parts: c.compact ? [time] : [queue, time] };
}

export function viewOf(c: ViewContext, i: number): ShapeModel {
  switch (c.id) {
    case "fixed-window":
      return fixedView(c, i);
    case "sliding-counter":
      return counterView(c, i);
    case "sliding-log":
      return logView(c, i);
    case "token-bucket":
      return tokenView(c, i);
    case "leaky-bucket":
      return leakyView(c, i);
  }
}
