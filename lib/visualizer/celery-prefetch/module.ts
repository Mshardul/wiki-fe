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
import { CELERY_SCENARIOS } from "./scenarios";
import type { CeleryScenario } from "./types";

export const CELERY_KICKER = "Celery 5.6–5.7 · prefork pool · Redis broker unless noted";
export const CELERY_FOOTNOTE =
  "Times and task names are illustrative; defaults match the Celery docs listed in the content doc.";

function scenarioOf(values: InputValues): CeleryScenario {
  const id = String(values.scenario ?? "happy");
  return CELERY_SCENARIOS.find((s) => s.id === id) ?? CELERY_SCENARIOS[0]!;
}

function infoFor(sc: CeleryScenario): InfoContent {
  return mechanismInfo(sc, "celery");
}

export function celeryFrames(sc: CeleryScenario): VizFrame[] {
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
    model: frameModel(frame),
  }));
}

export function runCeleryPrefetch(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: celeryFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const celeryPrefetchModule: VisualizerModule = {
  slug: "inside-celery-prefetch",
  title: "Inside Celery Prefetch",
  subtitle:
    "Two moments drive most surprises — when a worker reserves a message and when it acknowledges it.",
  unit: "step",
  subject: "Celery",
  kicker: CELERY_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.celery,
  footnote: CELERY_FOOTNOTE,
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
          options: CELERY_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runCeleryPrefetch,
};
