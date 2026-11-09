import type { ScheduleModel, ScheduleStyle } from "@/lib/visualizer/core/shapes";
import type { GilSeg, GilTrace } from "./types";

const STYLE: Record<GilSeg["type"], ScheduleStyle> = { run: "solid", wait: "hatch", io: "outline" };

const CHECKPOINT_NOTE =
  "Checkpoints in 3.12: function entry (RESUME) and loop back-edges. A pending drop request waits for one.";

export function traceModel(trace: GilTrace, now: number, track: string): ScheduleModel {
  return {
    kind: "schedule",
    track,
    end: trace.max,
    now,
    tickEvery: 2,
    marksEvery: trace.tickEvery ?? null,
    unit: trace.unit,
    axisLabel: `${trace.label ?? ""} · bytecode steps →`,
    summary: {
      label: "GIL",
      segments: trace.lanes.flatMap((lane) =>
        lane.segs
          .filter((s) => s.type === "run")
          .map((s) => ({ from: s.s, to: s.e, style: "solid" as const, label: lane.id })),
      ),
    },
    rows: trace.lanes.map((lane) => ({
      id: lane.id,
      label: lane.name ?? lane.id,
      segments: lane.segs.map((s) => ({
        from: s.s,
        to: s.e,
        style: STYLE[s.type],
        ...(s.label ? { label: s.label } : {}),
      })),
    })),
    meters: trace.timers.map((t) => ({
      row: t.lane,
      from: t.s,
      to: Math.min(t.e, trace.max),
      label: "5 ms switch timer",
    })),
    arrows: trace.reqs.flatMap((r) =>
      r.from && r.to ? [{ at: r.t, from: r.from, to: r.to, label: r.label ?? "drop request" }] : [],
    ),
    pins: trace.ticks.map((k) => ({
      at: k.t,
      row: k.lane,
      ...(k.label ? { label: k.label } : {}),
    })),
    values: trace.counter
      ? {
          label: "counter",
          points: trace.counter.map((c) => ({
            at: c.t,
            text: c.v,
            ...(c.note ? { note: c.note } : {}),
            ...(c.bad ? { bad: true } : {}),
          })),
        }
      : null,
    share: trace.unit ? { lead: "GIL held at", idle: "free" } : null,
    note: trace.unit ? null : CHECKPOINT_NOTE,
  };
}
