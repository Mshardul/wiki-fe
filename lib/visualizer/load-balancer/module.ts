import type { FieldSection, InputValues } from "../core/fields";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { COPY, DEFAULT_DURATIONS } from "./copy";
import { balancerFrames } from "./frames";
import { parseDurations, toLbInput } from "./input";
import { balancerRevision } from "./revision";
import {
  DEFAULT_SERVERS,
  FAIL_BEFORE,
  MAX_REQUESTS,
  MAX_SERVERS,
  MIN_SERVERS,
  POLICY_IDS,
  type PolicyId,
  WORKLOADS,
} from "./types";

export const BALANCER_SECTIONS: FieldSection[] = [
  {
    title: "Variant",
    fields: [
      {
        kind: "chips",
        key: "policy",
        label: "Variant",
        param: "p",
        hideLabel: true,
        options: POLICY_IDS.map((id) => ({ value: id, label: COPY[id].name })),
      },
    ],
  },
  {
    title: "Servers",
    fields: [
      {
        kind: "slider",
        key: "servers",
        label: "Server count",
        param: "n",
        min: MIN_SERVERS,
        max: MAX_SERVERS,
      },
      {
        kind: "chips",
        key: "failure",
        label: "Server failure",
        param: "f",
        options: [
          { value: "none", label: "None" },
          ...Array.from({ length: MAX_SERVERS }, (_, i) => ({
            value: String(i + 1),
            label: `S${i + 1}`,
          })),
        ],
      },
    ],
  },
  {
    title: "Requests",
    fields: [
      {
        kind: "chips",
        key: "workload",
        label: "Request durations",
        param: "w",
        options: WORKLOADS.map((w) => ({ value: w, label: w === "even" ? "Even" : "Uneven" })),
      },
      {
        kind: "sequence",
        key: "durations",
        label: "Ticks per request",
        param: "d",
        maxLen: MAX_REQUESTS,
        hint: "One digit per request, 1–9 ticks · Enter to apply",
        resetBy: ["workload"],
        parse: (raw) => parseDurations(raw),
      },
    ],
  },
];

function infoOf(id: PolicyId): InfoContent {
  const c = COPY[id];
  return {
    heading: "Variant",
    name: c.name,
    chip: c.chip,
    rule: c.rule,
    about: c.about,
    tries: c.tries,
    articleHref: c.articleHref,
  };
}

export const balancerModule: VisualizerModule = {
  slug: "load-balancer-algorithms",
  title: "Load Balancer Algorithms",
  subtitle: "Send requests to servers and watch where long ones pile up.",
  unit: "step",
  subject: "Servers",
  variants: { key: "policy" },
  revision: balancerRevision(),
  sections: BALANCER_SECTIONS,
  defaults: (): InputValues => ({
    policy: "round-robin",
    servers: DEFAULT_SERVERS,
    failure: "none",
    workload: "uneven",
    durations: DEFAULT_DURATIONS,
  }),
  availability: (values) => {
    const servers = toLbInput(values).servers;
    return {
      failure: { hint: `Fails just before request ${FAIL_BEFORE}; only S1–S${servers} exist.` },
    };
  },
  run(values): RunResult {
    const input = toLbInput(values);
    return {
      frames: balancerFrames(input),
      info: infoOf(input.policy),
      metricLabel: "Most connections",
      sequence: input.tokens,
      sequences: { durations: input.tokens },
    };
  },
};
