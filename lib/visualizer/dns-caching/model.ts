import type { DnsCachingModel } from "@/lib/visualizer/core/shapes";
import type { DnsFrame } from "./types";

export function frameModel(frame: DnsFrame): DnsCachingModel {
  return {
    kind: "dns-caching",
    clock: frame.clock,
    badge: frame.badge ?? "",
    badgeBad: frame.bad,
    term: frame.term,
    boxes: frame.boxes,
    req: frame.req,
    answerArrows: frame.answerArrows,
    extra: frame.extra,
    timeline: frame.tl,
  };
}
