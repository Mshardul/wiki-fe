import type { CacheStampedeModel } from "@/lib/visualizer/core/shapes";
import { stampedeDiagram } from "./diagram";
import type { StampedeFrame, StampedeScenario } from "./types";

export function frameModel(frame: StampedeFrame, sc: StampedeScenario): CacheStampedeModel {
  const { svg, sum } = stampedeDiagram(sc.view, frame);
  return {
    kind: "cache-stampede",
    view: sc.view,
    clock: frame.clock,
    badge: frame.badge ?? "",
    badgeBad: frame.bad,
    term: frame.term,
    diagramSvg: svg,
    summaryHtml: sum,
  };
}
