import type { InputValues } from "@/lib/visualizer/core/fields";
import type { ScheduleSwatch } from "@/lib/visualizer/core/shapes";
import type { InfoContent, RunResult, VisualizerModule } from "@/lib/visualizer/core/types";
import { mechanismInfo } from "../mechanism/info";
import { MECHANISM_GLOSSARY_TERM } from "../mechanism/links";
import { richFromHtml } from "../mechanism/rich";
import { frameModel } from "./model";
import { HTTP_SCENARIOS } from "./scenarios";
import type { HttpPipelineScenario } from "./types";

export const HTTP_KICKER = "AWS ALB · nginx · gunicorn (sync workers) · Django";
export const HTTP_FOOTNOTE =
  "Defaults shown are the stock values of each tool; scenario 2 sets its timeouts explicitly.";

export const HTTP_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Request path", swatch: "http-req" },
  { label: "Response path", swatch: "http-res" },
  { label: "Never ran", swatch: "http-skip" },
  { label: "Failed or killed", swatch: "http-fail" },
  { label: "Timeout clock", swatch: "http-clock" },
  { label: "Busy worker", swatch: "http-worker" },
];

function scenarioOf(values: InputValues): HttpPipelineScenario {
  const id = String(values.scenario ?? "happy");
  const found = HTTP_SCENARIOS.find((s) => s.id === id) ?? HTTP_SCENARIOS[0];
  if (!found) throw new Error("http pipeline scenarios missing");
  return found;
}

function infoFor(sc: HttpPipelineScenario): InfoContent {
  return mechanismInfo(sc, "http");
}

export function httpRequestPathFrames(sc: HttpPipelineScenario) {
  return sc.frames.map((frame, index) => {
    const bad = Boolean(frame.statusErr || frame.token.err);
    return {
      index,
      label: frame.h,
      outcome: bad ? ("bad" as const) : ("good" as const),
      badge: "",
      caption: [frame.h],
      lines: [richFromHtml(frame.b)],
      path: [],
      vars: [],
      logNote: [],
      metric: "",
      model: frameModel(frame),
    };
  });
}

export function runHttpRequestPath(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: httpRequestPathFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const httpRequestPathModule: VisualizerModule = {
  slug: "inside-an-http-request",
  title: "Inside an HTTP Request",
  subtitle:
    "One concrete stack (ALB → nginx → gunicorn → Django). Request down the left rail, response up the right — and see which layer answers first.",
  unit: "step",
  subject: "HTTP",
  kicker: HTTP_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.http,
  legend: HTTP_LEGEND,
  footnote: HTTP_FOOTNOTE,
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
          options: HTTP_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runHttpRequestPath,
};
