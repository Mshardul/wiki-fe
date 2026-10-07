export type Axis = "vertical" | "horizontal";
export type ActiveTone = "new" | "hit";

export interface LinearModel {
  kind: "linear";
  items: string[];
  capacity: number;
  next: string | null;
  active: string | null;
  tone: ActiveTone | null;
  evicted: string | null;
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
// Rows arrive already ranked (rank 0 first); the last row is the next victim when the cache is full.
export interface RankingModel {
  kind: "ranking";
  rows: RankingRow[];
  capacity: number;
  next: string | null;
  active: string | null;
  tone: ActiveTone | null;
  evicted: string | null;
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

export type ShapeModel = LinearModel | HistogramModel | RankingModel | RingModel;

export function defaultAxis(model: ShapeModel): Axis | null {
  return model.kind === "ring" || model.kind === "ranking" ? null : model.defaultAxis;
}

export function resolveAxis(model: ShapeModel, rotated: boolean): Axis | null {
  const axis = defaultAxis(model);
  if (axis === null || !rotated) return axis;
  return axis === "vertical" ? "horizontal" : "vertical";
}

export function modelKeys(model: ShapeModel): string[] {
  if (model.kind === "linear") return model.items;
  if (model.kind === "ranking") return model.rows.map((r) => r.key);
  return model.slots.flatMap((s) => (s ? [s.key] : []));
}
