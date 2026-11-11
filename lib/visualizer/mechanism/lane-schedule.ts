import type { ScheduleModel, ScheduleStyle } from "@/lib/visualizer/core/shapes";

export type LaneSegType = "run" | "wait" | "io" | "thr";

export interface LaneSeg {
  s: number;
  e: number;
  type: LaneSegType;
  label?: string;
}

export interface LaneDef {
  id: string;
  name?: string;
  segs: LaneSeg[];
}

export interface LaneTrace {
  max: number;
  unit: string;
  label?: string;
  lanes: LaneDef[];
}

const STYLE: Record<LaneSegType, ScheduleStyle> = {
  run: "solid",
  wait: "hatch",
  io: "outline",
  thr: "thread",
};

export function tickEveryForMax(max: number): number {
  if (max <= 30) return 2;
  if (max <= 100) return 10;
  if (max <= 250) return 20;
  return 50;
}

export function laneScheduleModel(
  trace: LaneTrace,
  now: number,
  track: string,
  opts: { summaryLabel: string; shareLead: string; note?: string | null },
): ScheduleModel {
  return {
    kind: "schedule",
    track,
    end: trace.max,
    now,
    tickEvery: tickEveryForMax(trace.max),
    marksEvery: null,
    unit: trace.unit,
    axisLabel: trace.label ?? "",
    summary: {
      label: opts.summaryLabel,
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
    share: { lead: opts.shareLead, idle: "idle" },
    note: opts.note ?? null,
  };
}
