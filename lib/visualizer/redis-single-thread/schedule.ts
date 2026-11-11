import { type LaneTrace, laneScheduleModel } from "@/lib/visualizer/mechanism/lane-schedule";

export function traceModel(trace: LaneTrace, now: number, track: string, note?: string | null) {
  return laneScheduleModel(trace, now, track, {
    summaryLabel: "Main",
    shareLead: "Main thread at",
    note,
  });
}
