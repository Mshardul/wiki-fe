import type { InputValues } from "@/lib/visualizer/core/fields";
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
import { STAMPEDE_SCENARIOS } from "./scenarios";
import type { StampedeScenario } from "./types";

export const STAMPEDE_KICKER = "Cache-aside · Redis in front of SQL · illustrative numbers";
export const STAMPEDE_FOOTNOTE =
  "Request rates, query times, and capacity are illustrative; mechanisms match common production patterns.";

function scenarioOf(values: InputValues): StampedeScenario {
  const id = String(values.scenario ?? "happy");
  return STAMPEDE_SCENARIOS.find((s) => s.id === id) ?? STAMPEDE_SCENARIOS[0]!;
}

function infoFor(sc: StampedeScenario): InfoContent {
  return mechanismInfo(sc, "stampede");
}

export function stampedeFrames(sc: StampedeScenario): VizFrame[] {
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

export function runCacheStampede(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: stampedeFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const cacheStampedeModule: VisualizerModule = {
  slug: "inside-a-cache-stampede",
  title: "Inside a Cache Stampede",
  subtitle:
    "A cache protects the database only while the value is in it — step through what happens when a hot key or a thousand keys expire together.",
  unit: "step",
  subject: "Cache",
  kicker: STAMPEDE_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.stampede,
  footnote: STAMPEDE_FOOTNOTE,
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
          options: STAMPEDE_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runCacheStampede,
};
