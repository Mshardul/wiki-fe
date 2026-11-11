import type { CeleryBoardModel } from "@/lib/visualizer/core/shapes";
import type { CeleryFrame } from "./types";

export function frameModel(frame: CeleryFrame): CeleryBoardModel {
  return {
    kind: "celery-board",
    clock: frame.clock,
    badge: frame.badge ?? "",
    badgeBad: frame.bad,
    term: frame.term,
    queue: frame.queue,
    unacked: frame.unacked,
    workers: frame.workers,
    done: frame.done,
    on: frame.on ?? [],
  };
}
