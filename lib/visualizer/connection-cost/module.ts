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
import { CONN_COST_SCENARIOS } from "./scenarios";
import type { ConnCostScenario } from "./types";

export const CONN_COST_KICKER = "TCP · TLS 1.3 · Linux · RTT 100 ms (illustrative)";
export const CONN_COST_FOOTNOTE =
  "RTT, request rate and response size are illustrative; protocol behaviour matches the sources in the content doc.";

const LADDER_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "TCP", swatch: "conn-tcp" },
  { label: "TLS handshake", swatch: "conn-tls" },
  { label: "Request / response", swatch: "conn-req" },
  { label: "Session ticket", swatch: "conn-ticket" },
  { label: "0-RTT early data", swatch: "conn-early" },
  { label: "Replay", swatch: "conn-bad" },
];

export const CONN_COST_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  ...LADDER_LEGEND,
  { label: "TIME_WAIT (60 s)", swatch: "conn-tw" },
];

function scenarioOf(values: InputValues): ConnCostScenario {
  const id = String(values.scenario ?? "happy");
  return CONN_COST_SCENARIOS.find((s) => s.id === id) ?? CONN_COST_SCENARIOS[0]!;
}

function infoFor(sc: ConnCostScenario): InfoContent {
  return mechanismInfo(sc, "connCost");
}

export function connCostFrames(sc: ConnCostScenario): VizFrame[] {
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

export function runConnectionCost(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: connCostFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const connectionCostModule: VisualizerModule = {
  slug: "cost-of-a-new-connection",
  title: "The Cost of a New Connection",
  subtitle:
    "Handshakes are paid in round trips; closing a connection parks the client's port in TIME_WAIT — reuse beats reopening.",
  unit: "step",
  subject: "Networking",
  kicker: CONN_COST_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.connCost,
  legend: CONN_COST_LEGEND,
  footnote: CONN_COST_FOOTNOTE,
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
          options: CONN_COST_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runConnectionCost,
};
