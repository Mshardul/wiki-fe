import type { InputValues } from "@/lib/visualizer/core/fields";
import type { ScheduleSwatch } from "@/lib/visualizer/core/shapes";
import type {
  InfoContent,
  RunResult,
  VisualizerModule,
  VizFrame,
} from "@/lib/visualizer/core/types";
import { mechanismInfo } from "../mechanism/info";
import { MECHANISM_GLOSSARY_TERM } from "../mechanism/links";
import { richFromHtml } from "../mechanism/rich";
import { frameModel } from "./model";
import { CONN_POOL_SCENARIOS } from "./scenarios";
import type { ConnPoolScenario } from "./types";

export const CONN_POOL_KICKER =
  "Keep-alive pools · AWS NLB and ALB · Python clients · illustrative";
export const CONN_POOL_FOOTNOTE =
  "Timeouts match the documented defaults named on each tab; pauses and rates are illustrative.";

export const CONN_POOL_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Idle time on a party's timer", swatch: "pool-idle" },
  { label: "Idle limit / failure", swatch: "pool-limit" },
  { label: "Flow forgotten (silent drop)", swatch: "pool-gone" },
  { label: "Request", swatch: "pool-req" },
  { label: "Keepalive / success", swatch: "pool-ok" },
  { label: "Busy connection", swatch: "pool-busy" },
  { label: "Free connection", swatch: "pool-free" },
  { label: "Waiting request", swatch: "pool-wait" },
];

function scenarioOf(values: InputValues): ConnPoolScenario {
  const id = String(values.scenario ?? "happy");
  return CONN_POOL_SCENARIOS.find((s) => s.id === id) ?? CONN_POOL_SCENARIOS[0]!;
}

function infoFor(sc: ConnPoolScenario): InfoContent {
  return mechanismInfo(sc, "connPool");
}

export function connPoolFrames(sc: ConnPoolScenario): VizFrame[] {
  return sc.frames.map((frame, index) => ({
    index,
    label: frame.h,
    outcome: frame.bad ? "bad" : "good",
    badge: frame.badge ?? "",
    caption: [frame.h],
    lines: [richFromHtml(frame.b)],
    path: [],
    vars: [],
    logNote: [],
    metric: "",
    model: frameModel(frame, sc),
  }));
}

export function runConnectionPool(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: connPoolFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const connectionPoolModule: VisualizerModule = {
  slug: "inside-a-connection-pool",
  title: "Inside a Connection Pool",
  subtitle:
    "Each hop keeps its own idle timer — reuse only works while every party still believes the connection is open.",
  unit: "step",
  subject: "Networking",
  kicker: CONN_POOL_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.connPool,
  legend: CONN_POOL_LEGEND,
  footnote: CONN_POOL_FOOTNOTE,
  variants: { key: "scenario", restartOnSwitch: true },
  sections: [
    {
      title: "Scenario",
      fields: [
        {
          key: "scenario",
          label: "Scenario",
          param: "s",
          hideLabel: true,
          kind: "chips",
          options: CONN_POOL_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runConnectionPool,
};
