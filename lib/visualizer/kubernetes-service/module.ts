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
import { K8S_SERVICE_SCENARIOS } from "./scenarios";
import type { K8sServiceScenario } from "./types";

export const K8S_SERVICE_KICKER = "Kubernetes 1.33+ · kube-proxy / EndpointSlice defaults";
export const K8S_SERVICE_FOOTNOTE =
  "Names and IPs are illustrative; behaviour matches current Kubernetes Service and EndpointSlice docs.";

export const K8S_SERVICE_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Ready endpoint / working connection", swatch: "k8s-ep-ready" },
  { label: "Not ready", swatch: "k8s-ep-wait" },
  { label: "Terminating", swatch: "k8s-ep-term" },
  { label: "New connection this step", swatch: "k8s-conn-new" },
  { label: "Failed connection", swatch: "k8s-conn-fail" },
];

function scenarioOf(values: InputValues): K8sServiceScenario {
  const id = String(values.scenario ?? "happy");
  return K8S_SERVICE_SCENARIOS.find((s) => s.id === id) ?? K8S_SERVICE_SCENARIOS[0]!;
}

function infoFor(sc: K8sServiceScenario): InfoContent {
  return mechanismInfo(sc, "k8sSvc");
}

export function k8sServiceFrames(sc: K8sServiceScenario): VizFrame[] {
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

export function runKubernetesService(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: k8sServiceFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const kubernetesServiceModule: VisualizerModule = {
  slug: "inside-a-kubernetes-service",
  title: "Inside a Kubernetes Service",
  subtitle:
    "A ClusterIP is virtual: DNS returns an IP that only exists as rules on every node, kept in sync from EndpointSlices.",
  unit: "step",
  subject: "Kubernetes",
  kicker: K8S_SERVICE_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.k8sSvc,
  legend: K8S_SERVICE_LEGEND,
  footnote: K8S_SERVICE_FOOTNOTE,
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
          options: K8S_SERVICE_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runKubernetesService,
};
