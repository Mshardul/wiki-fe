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
import { KUBECTL_SCENARIOS } from "./scenarios";
import type { KubectlScenario } from "./types";

export const KUBECTL_KICKER = "Kubernetes 1.33+ · behaviour stable across recent releases";
export const KUBECTL_FOOTNOTE =
  "Names, IPs and timings are illustrative; defaults are from the Kubernetes API reference and Pod Lifecycle docs.";

export const KUBECTL_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Acting / just written", swatch: "k8s-act" },
  { label: "Container starting", swatch: "k8s-creating" },
  { label: "Running, not Ready", swatch: "k8s-running" },
  { label: "Ready (gets Service traffic)", swatch: "k8s-ready" },
  { label: "Failing", swatch: "k8s-fail" },
];

function scenarioOf(values: InputValues): KubectlScenario {
  const id = String(values.scenario ?? "happy");
  return KUBECTL_SCENARIOS.find((s) => s.id === id) ?? KUBECTL_SCENARIOS[0]!;
}

function infoFor(sc: KubectlScenario): InfoContent {
  return mechanismInfo(sc, "kubectl");
}

export function kubectlFrames(sc: KubectlScenario): VizFrame[] {
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

export function runKubectlApply(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: kubectlFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const kubectlApplyModule: VisualizerModule = {
  slug: "inside-kubectl-apply",
  title: "Inside kubectl apply",
  subtitle:
    "kubectl apply only stores intent in the API server; controllers and kubelets reconcile the cluster in separate loops.",
  unit: "step",
  subject: "Kubernetes",
  kicker: KUBECTL_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.kubectl,
  legend: KUBECTL_LEGEND,
  footnote: KUBECTL_FOOTNOTE,
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
          options: KUBECTL_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runKubectlApply,
};
