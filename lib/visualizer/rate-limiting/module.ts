import {
  clampInt,
  type FieldAvailability,
  type FieldSection,
  type InputValues,
  SEED_MAX,
} from "../core/fields";
import { randomSeed } from "../core/rng";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { ALGORITHM_META, RATE_LIMITING_ARTICLE } from "./copy";
import { buildFrames } from "./frames";
import { rateLimitingRevision } from "./revision";
import { parseTicks } from "./ticks";
import { generateTicks } from "./trace";
import {
  ALGORITHM_IDS,
  type AlgorithmId,
  MAX_LIMIT,
  MAX_REQUESTS,
  MIN_LIMIT,
  paramsOf,
  type RateInput,
  WORKLOADS,
  type Workload,
} from "./types";

const WORKLOAD_LABELS: Record<Workload, string> = {
  steady: "Steady",
  burst: "Burst",
  straddle: "Boundary straddle",
  "idle-burst": "Idle then burst",
};

export const RATE_LIMITING_SECTIONS: FieldSection[] = [
  {
    title: "Algorithm",
    fields: [
      {
        kind: "chips",
        key: "algorithm",
        label: "Algorithm",
        param: "a",
        hideLabel: true,
        options: ALGORITHM_IDS.map((id) => ({ value: id, label: ALGORITHM_META[id].name })),
      },
    ],
  },
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "limit", label: "Limit", param: "l", min: MIN_LIMIT, max: MAX_LIMIT },
      {
        kind: "chips",
        key: "pace",
        label: "Pace",
        param: "pc",
        options: [
          { value: "1", label: "1 per tick" },
          { value: "2", label: "1 per 2 ticks" },
        ],
      },
      {
        kind: "chips",
        key: "workload",
        label: "Workload",
        param: "w",
        options: WORKLOADS.map((w) => ({ value: w, label: WORKLOAD_LABELS[w] })),
      },
      {
        kind: "sequence",
        key: "sequence",
        label: "Sequence",
        param: "q",
        maxLen: MAX_REQUESTS,
        hint: "Arrival ticks, e.g. 4 5 5 6 · Enter to apply",
        resetBy: ["limit", "pace", "workload", "seed"],
        parse: parseTicks,
        join: "_",
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

// Chosen for learning: a burst that straddles the first window boundary plus one late request, so every algorithm shows its defining behaviour in eight requests.
const DEFAULTS = {
  algorithm: "fixed-window",
  limit: 3,
  pace: "2",
  workload: "straddle",
  sequence: ["4", "5", "5", "6", "6", "7", "7", "11"],
} as const;

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

export function toRateInput(v: InputValues): RateInput {
  const parsed = Array.isArray(v.sequence) ? parseTicks(v.sequence.join(" ")) : null;
  return {
    algorithm: ALGORITHM_IDS.find((a) => a === v.algorithm) ?? DEFAULTS.algorithm,
    limit: clampInt(num(v.limit, DEFAULTS.limit), MIN_LIMIT, MAX_LIMIT),
    pace: String(v.pace) === "1" ? 1 : 2,
    workload: WORKLOADS.find((w) => w === v.workload) ?? DEFAULTS.workload,
    seed: clampInt(num(v.seed, 0), 0, SEED_MAX),
    ticks: parsed?.ok ? parsed.tokens.map(Number) : null,
  };
}

function availability(values: InputValues): Record<string, FieldAvailability> {
  const input = toRateInput(values);
  const p = paramsOf(input.limit, input.pace);
  const rate = input.pace === 1 ? "1 request per tick" : "1 request per 2 ticks";
  return {
    limit: { hint: "Max per window · bucket size for the buckets" },
    pace: {
      hint: `${rate} = ${p.limit} per ${p.window} ticks, the same average rate for every algorithm`,
    },
  };
}

function infoOf(id: AlgorithmId): InfoContent {
  const m = ALGORITHM_META[id];
  return {
    heading: "Algorithm",
    name: m.name,
    chip: m.chip,
    rule: m.rule,
    about: m.about,
    tries: m.tries,
    articleHref: `${RATE_LIMITING_ARTICLE}#${m.anchor}`,
  };
}

export const rateLimitingModule: VisualizerModule = {
  slug: "rate-limiting",
  title: "Rate limiting",
  subtitle: "Five ways to say no to too many requests.",
  unit: "request",
  subject: "Limiter",
  variants: { key: "algorithm", restartOnSwitch: true },
  revision: rateLimitingRevision(),
  sections: RATE_LIMITING_SECTIONS,
  defaults: () => ({ ...DEFAULTS, sequence: [...DEFAULTS.sequence], seed: randomSeed() }),
  availability,
  run(values): RunResult {
    const input = toRateInput(values);
    const params = paramsOf(input.limit, input.pace);
    const ticks = input.ticks ?? generateTicks(input.workload, params, input.seed);
    const { frames } = buildFrames(input.algorithm, params, ticks);
    return {
      frames,
      info: infoOf(input.algorithm),
      metricLabel: `Peak ${input.algorithm === "leaky-bucket" ? "out " : ""}in any ${params.window} ticks`,
      sequence: ticks.map(String),
    };
  },
};
