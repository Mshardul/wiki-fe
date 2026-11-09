export type Axis = "vertical" | "horizontal";
export type ActiveTone = "new" | "existing";

export interface LinearModel {
  kind: "linear";
  items: string[];
  capacity: number;
  next: string | null;
  active: string | null;
  tone: ActiveTone | null;
  removed: string | null;
  labels: { entry: string; exit: string };
  defaultAxis: Axis;
}

export interface HistogramSlot {
  key: string;
  count: number;
}
export interface HistogramModel {
  kind: "histogram";
  slots: (HistogramSlot | null)[];
  next: string | null;
  active: string | null;
  tone: ActiveTone | null;
  defaultAxis: Axis;
}

export interface RankingRow {
  key: string;
  count: number;
}
// Rows arrive already ranked (rank 0 first); the last row is the next one out when the structure is full.
export interface RankingModel {
  kind: "ranking";
  rows: RankingRow[];
  capacity: number;
  next: string | null;
  active: string | null;
  tone: ActiveTone | null;
  removed: string | null;
}

export interface RingSlot {
  key: string;
  bit: 0 | 1;
}
export interface RingModel {
  kind: "ring";
  slots: (RingSlot | null)[];
  hand: number;
  turns: number;
  cleared: number[];
  active: number | null;
  tone: ActiveTone | null;
}

export type LaneTone = "changed" | "stale" | "lost" | "muted";
export interface CardItem {
  text: string;
  tone?: LaneTone;
  bar?: { value: number; max: number };
}
export interface CardSection {
  title: string;
  layout: "rows" | "chips";
  items: CardItem[];
}
export interface Lane {
  id: string;
  name: string;
  dead?: boolean;
  sections: CardSection[];
}
export interface Hop {
  from: string;
  to: string;
  label: string;
  thread: 0 | 1;
  reply?: boolean;
  flag?: boolean;
}
// Hops are drawn top to bottom and numbered by position; slots and cardRows are run-wide so the stage keeps one height.
export interface LanesModel {
  kind: "lanes";
  lanes: Lane[];
  hops: Hop[];
  slots: number;
  cardRows: number;
  // Changes on every step, so a hop that looks like the previous step's still replays its fade-in.
  epoch?: number;
  note?: string;
}

export type TimelineTone = "good" | "bad" | "faded";
export interface TimelineMark {
  at: number;
  tone: TimelineTone;
  current?: boolean;
  // Spoken instead of the tone word, e.g. "allowed".
  title?: string;
}
export interface TimelineRow {
  label: string;
  marks: TimelineMark[];
}
export interface TimelineBand {
  from: number;
  to: number;
  label: string;
  // Shown instead of label on narrow stages.
  short?: string;
}
export type SpanStyle = "outline" | "fill" | "hatch" | "alert";
export interface TimelineSpan {
  from: number;
  to: number;
  label: string;
  short?: string;
  style: SpanStyle;
}
// stack and lanes are run-wide maxima (tallest pile of simultaneous marks, most labelled spans) so the stage keeps one height.
export interface TimelineModel {
  kind: "timeline";
  ticks: number;
  now: number;
  stack: number;
  lanes: number;
  rows: TimelineRow[];
  bands: TimelineBand[];
  spans: TimelineSpan[];
  boundaries: number[];
}

export type ScheduleStyle = "solid" | "hatch" | "outline" | "thread";
export type ScheduleSwatch = ScheduleStyle | "meter" | "arrow" | "pin";
export interface ScheduleSegment {
  from: number;
  to: number;
  style: ScheduleStyle;
  label?: string;
}
export interface ScheduleRow {
  id: string;
  label: string;
  segments: ScheduleSegment[];
}
export interface ScheduleMeter {
  row: string;
  from: number;
  to: number;
  label?: string;
}
export interface ScheduleArrow {
  at: number;
  from: string;
  to: string;
  label: string;
}
export interface SchedulePin {
  at: number;
  row: string;
  label?: string;
}
export interface ScheduleValue {
  at: number;
  text: string;
  note?: string;
  bad?: boolean;
}
// Continuous time from 0 to end; the shape draws only what has happened by now.
export interface ScheduleModel {
  kind: "schedule";
  // Frames with the same track glide from one now to the next; a new track starts from 0.
  track: string;
  end: number;
  now: number;
  tickEvery: number;
  // Faint marks along solid segments at this spacing, e.g. points where a lock could change hands.
  marksEvery: number | null;
  // Suffix on the 0 tick. Null draws the numbers with no suffix; a caption can still sit above them.
  unit: string | null;
  axisLabel: string;
  summary: { label: string; segments: ScheduleSegment[] } | null;
  rows: ScheduleRow[];
  meters: ScheduleMeter[];
  arrows: ScheduleArrow[];
  pins: SchedulePin[];
  values: { label: string; points: ScheduleValue[] } | null;
  // Solid time per row so far, read as "<lead> <now>: <row> <time> (<share>%) … <idle> <rest>".
  share: { lead: string; idle: string } | null;
  note: string | null;
}

export type LeafModel =
  | LinearModel
  | HistogramModel
  | RankingModel
  | RingModel
  | LanesModel
  | TimelineModel;
export interface CompositeModel {
  kind: "composite";
  parts: LeafModel[];
}
export type ShapeModel = LeafModel | CompositeModel | ScheduleModel;

export function defaultAxis(model: ShapeModel): Axis | null {
  return model.kind === "linear" || model.kind === "histogram" ? model.defaultAxis : null;
}

export function resolveAxis(model: ShapeModel, rotated: boolean): Axis | null {
  const axis = defaultAxis(model);
  if (axis === null || !rotated) return axis;
  return axis === "vertical" ? "horizontal" : "vertical";
}

export function modelKeys(model: ShapeModel): string[] {
  if (model.kind === "linear") return model.items;
  if (model.kind === "ranking") return model.rows.map((r) => r.key);
  if (model.kind === "lanes" || model.kind === "timeline" || model.kind === "schedule") return [];
  if (model.kind === "composite") return model.parts.flatMap(modelKeys);
  return model.slots.flatMap((s) => (s ? [s.key] : []));
}

export function timelineLabel(model: TimelineModel, subject: string): string {
  const rows = model.rows.map((r) => {
    const marks = r.marks.map((m) => `tick ${m.at} ${m.title ?? m.tone}`).join(", ");
    return `${r.label ? `${r.label}: ` : ""}${marks || "no marks"}`;
  });
  return `${subject}: ${rows.join("; ")}`;
}
