import type { ScheduleModel, ScheduleSegment, ScheduleSwatch } from "./shapes";
import type { VizFrame } from "./types";

/** Swatches the run's schedules actually draw, or null when no frame is a schedule. */
export function swatchesIn(frames: VizFrame[]): Set<ScheduleSwatch> | null {
  const out = new Set<ScheduleSwatch>();
  let any = false;
  for (const { model: m } of frames) {
    if (m.kind !== "schedule") continue;
    any = true;
    for (const row of m.rows) for (const s of row.segments) out.add(s.style);
    if (m.meters.length > 0) out.add("meter");
    if (m.arrows.length > 0) out.add("arrow");
    if (m.pins.length > 0) out.add("pin");
  }
  return any ? out : null;
}

const EPS = 1e-6;

/**
 * Moments where the picture changes: a row starts or switches style, the summary changes
 * hands, or a meter, arrow, pin or value appears. A new label on a continuing segment of
 * the same style is not a change.
 */
export function scheduleEvents(model: ScheduleModel): number[] {
  const times: number[] = [];
  for (const row of model.rows) {
    let prev: ScheduleSegment | undefined;
    for (const s of row.segments) {
      if (!prev || prev.style !== s.style || Math.abs(prev.to - s.from) > EPS) times.push(s.from);
      prev = s;
    }
  }
  const held = [...(model.summary?.segments ?? [])].sort((a, b) => a.from - b.from);
  held.forEach((s, i) => {
    const before = held[i - 1];
    const after = held[i + 1];
    if (!before || before.label !== s.label || Math.abs(before.to - s.from) > EPS)
      times.push(s.from);
    if (!after || after.label !== s.label || Math.abs(after.from - s.to) > EPS) times.push(s.to);
  });
  for (const m of model.meters) times.push(m.from);
  for (const a of model.arrows) times.push(a.at);
  for (const p of model.pins) times.push(p.at);
  for (const v of model.values?.points ?? []) times.push(v.at);
  const inside = times.filter((t) => t > EPS && t < model.end - EPS).sort((a, b) => a - b);
  return inside.filter((t, i) => i === 0 || t - (inside[i - 1] ?? 0) > EPS);
}

/** Steps that pass over a change without stopping on it, with the moments they skip. */
export function skippedEvents(frames: VizFrame[]): { step: number; at: number[] }[] {
  const out: { step: number; at: number[] }[] = [];
  let prev: ScheduleModel | null = null;
  frames.forEach((frame, step) => {
    const m = frame.model;
    if (m.kind !== "schedule") return;
    const from = prev && prev.track === m.track ? prev.now : 0;
    const at = scheduleEvents(m).filter((t) => t > from + EPS && t < m.now - EPS);
    if (at.length > 0) out.push({ step, at });
    prev = m;
  });
  return out;
}
