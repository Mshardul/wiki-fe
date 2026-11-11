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
import { POD_LIMITS_SCENARIOS } from "./scenarios";
import type { PodLimitsScenario } from "./types";

export const POD_LIMITS_KICKER = "Kubernetes 1.33+ · Linux nodes · kubelet defaults";
export const POD_LIMITS_FOOTNOTE =
  "Sizes and timings are illustrative; defaults are from the Kubernetes docs listed in the content doc.";

export const POD_LIMITS_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Usage within request", swatch: "gauge-in" },
  { label: "Usage above request", swatch: "gauge-over" },
  { label: "At the limit", swatch: "gauge-hit" },
  { label: "Request", swatch: "gauge-req" },
  { label: "Limit / node capacity", swatch: "gauge-cap" },
  { label: "Throttled (CPU scenario)", swatch: "gauge-thr" },
];

function scenarioOf(values: InputValues): PodLimitsScenario {
  const id = String(values.scenario ?? "happy");
  return POD_LIMITS_SCENARIOS.find((s) => s.id === id) ?? POD_LIMITS_SCENARIOS[0]!;
}

function infoFor(sc: PodLimitsScenario): InfoContent {
  return mechanismInfo(sc, "podLimits");
}

export function podLimitsFrames(sc: PodLimitsScenario): VizFrame[] {
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

export function runPodResourceLimits(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: podLimitsFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const podResourceLimitsModule: VisualizerModule = {
  slug: "inside-pod-resource-limits",
  title: "Inside Pod Resource Limits",
  subtitle:
    "Requests decide placement once; cgroup limits on the node enforce CPU quota and memory caps continuously.",
  unit: "step",
  subject: "Kubernetes",
  kicker: POD_LIMITS_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.podLimits,
  legend: POD_LIMITS_LEGEND,
  footnote: POD_LIMITS_FOOTNOTE,
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
          options: POD_LIMITS_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runPodResourceLimits,
};
