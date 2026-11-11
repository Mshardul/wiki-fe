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
import { DNS_SCENARIOS } from "./scenarios";
import type { DnsScenario } from "./types";

export const DNS_KICKER = "Runtime → systemd-resolved → VPC resolver → Route 53 · illustrative";
export const DNS_FOOTNOTE =
  "Times and IPs are illustrative; TTL rules match the sources listed in the content doc.";

export const DNS_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Answer (happy path)", swatch: "dns-ok" },
  { label: "Old IP 10.0.1.5", swatch: "dns-old" },
  { label: "New IP 10.0.2.9", swatch: "dns-new" },
  { label: "NXDOMAIN (negative)", swatch: "dns-nx" },
];

function scenarioOf(values: InputValues): DnsScenario {
  const id = String(values.scenario ?? "happy");
  return DNS_SCENARIOS.find((s) => s.id === id) ?? DNS_SCENARIOS[0]!;
}

function infoFor(sc: DnsScenario): InfoContent {
  return mechanismInfo(sc, "dns");
}

export function dnsFrames(sc: DnsScenario): VizFrame[] {
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

export function runDnsCaching(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: dnsFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const dnsCachingModule: VisualizerModule = {
  slug: "inside-dns-caching",
  title: "Inside DNS Caching",
  subtitle:
    "Every layer keeps its own copy of a DNS answer and counts down its own TTL — traffic follows whichever IP those copies still hand out.",
  unit: "step",
  subject: "DNS",
  kicker: DNS_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.dns,
  legend: DNS_LEGEND,
  footnote: DNS_FOOTNOTE,
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
          options: DNS_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runDnsCaching,
};
