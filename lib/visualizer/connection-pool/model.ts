import type { ConnectionPoolModel } from "@/lib/visualizer/core/shapes";
import type { ConnPoolFrame, ConnPoolScenario } from "./types";

export function frameModel(frame: ConnPoolFrame, scenario: ConnPoolScenario): ConnectionPoolModel {
  const view = frame.view ?? scenario.view;
  return {
    kind: "connection-pool",
    view,
    clock: frame.clock,
    badge: frame.badge ?? "",
    badgeBad: frame.bad,
    term: frame.term,
    axis: frame.axis,
    now: frame.now,
    parties: frame.parties,
    lane: frame.lane,
    ev: frame.ev,
    slots: frame.slots,
    busy: frame.busy,
    need: frame.need,
    queue: frame.queue,
    fix: frame.fix,
  };
}
