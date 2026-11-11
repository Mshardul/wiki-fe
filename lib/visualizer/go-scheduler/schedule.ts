import type { ScheduleModel, ScheduleStyle } from "@/lib/visualizer/core/shapes";
import { tickEveryForMax } from "@/lib/visualizer/mechanism/lane-schedule";
import type { GoSeg, GoTrace, RunQueues } from "./types";

const STYLE: Record<GoSeg["type"], ScheduleStyle> = {
  run: "solid",
  syscall: "outline",
  poll: "outline",
  queued: "hatch",
  park: "thread",
};

function queueNote(q: RunQueues): string {
  const parts = Object.entries(q).map(([k, items]) => {
    const name = k === "global" ? "global" : k === "netpoll" ? "netpoller" : `${k} local`;
    return `${name}: ${items.length ? items.join(", ") : "empty"}`;
  });
  return `Run queues: ${parts.join(" · ")}`;
}

function processorSegments(trace: GoTrace, p: string) {
  return trace.lanes.flatMap((lane) =>
    lane.segs
      .filter((s) => s.type === "run" && s.p === p)
      .map((s) => ({
        from: s.s,
        to: s.e,
        style: "solid" as const,
        label: s.label ? `${s.label.split(" ")[0]} on ${lane.id}` : undefined,
      })),
  );
}

export function traceModel(
  trace: GoTrace,
  now: number,
  track: string,
  queues?: RunQueues | null,
): ScheduleModel {
  const pRows = trace.ps.map((p) => ({
    id: p,
    label: p,
    segments: processorSegments(trace, p),
  }));
  const laneRows = trace.lanes.map((lane) => ({
    id: lane.id,
    label: lane.name ?? lane.id,
    segments: lane.segs.map((s) => ({
      from: s.s,
      to: s.e,
      style: STYLE[s.type],
      ...(s.label ? { label: s.label } : {}),
    })),
  }));
  return {
    kind: "schedule",
    track,
    end: trace.max,
    now,
    tickEvery: tickEveryForMax(trace.max),
    marksEvery: null,
    unit: "ms",
    axisLabel: trace.label ?? "",
    summary: null,
    rows: [...pRows, ...laneRows],
    meters: [],
    arrows: [],
    pins: (trace.marks ?? []).map((m) => ({
      at: m.t,
      row: m.lane,
      ...(m.label ? { label: m.label } : {}),
    })),
    values: null,
    share: { lead: "Go code on processors at", idle: "idle" },
    note: queues ? queueNote(queues) : (trace.label ?? null),
  };
}
