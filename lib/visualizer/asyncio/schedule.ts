import type { ScheduleModel, ScheduleStyle } from "@/lib/visualizer/core/shapes";
import type { AsyncioSeg, AsyncioTrace } from "./types";

const STYLE: Record<AsyncioSeg["type"], ScheduleStyle> = {
  run: "solid",
  wait: "hatch",
  io: "outline",
  thr: "thread",
};

export function traceModel(trace: AsyncioTrace, now: number, track: string): ScheduleModel {
  return {
    kind: "schedule",
    track,
    end: trace.max,
    now,
    tickEvery: 2,
    marksEvery: null,
    unit: trace.unit,
    axisLabel: trace.label ?? "",
    summary: {
      label: "Loop",
      segments: trace.lanes.flatMap((lane) =>
        lane.segs
          .filter((s) => s.type === "run")
          .map((s) => ({
            from: s.s,
            to: s.e,
            style: "solid" as const,
            label: lane.name ?? lane.id,
          })),
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
    meters: [],
    arrows: [],
    pins: [],
    values: null,
    share: { lead: "Loop thread at", idle: "idle" },
    note: null,
  };
}
