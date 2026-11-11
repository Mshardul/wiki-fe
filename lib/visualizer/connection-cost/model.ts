import type { ConnLadderModel } from "@/lib/visualizer/core/shapes";
import type { ConnCostFrame, ConnCostScenario } from "./types";

export function frameModel(frame: ConnCostFrame, scenario: ConnCostScenario): ConnLadderModel {
  const view = frame.view ?? scenario.view;
  return {
    kind: "conn-ladder",
    view,
    clock: frame.clock,
    badge: frame.badge ?? "",
    badgeBad: frame.bad,
    term: frame.term,
    lanes: frame.lanes,
    msgs: frame.msgs,
    phases: frame.phases,
    tmax: frame.tmax,
    now: frame.now,
    rtt: frame.rtt,
    marks: frame.marks,
    t: frame.t,
    fix: frame.fix,
    why: frame.why,
  };
}
