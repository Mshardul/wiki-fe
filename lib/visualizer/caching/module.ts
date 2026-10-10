import {
  allFields,
  clampInt,
  type FieldAvailability,
  type FieldSection,
  type InputValues,
  SEED_MAX,
} from "../core/fields";
import { randomSeed } from "../core/rng";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { CACHING_ARTICLE } from "../eviction/module";
import { simulate } from "./engine";
import { cachingRevision } from "./revision";
import { STRATEGIES } from "./strategies";
import { MAX_REQUESTS, opsOf, parseCachingSequence } from "./tokens";
import { generateSequence } from "./trace";
import {
  type CachingInput,
  STRATEGY_IDS,
  type StrategyDef,
  type StrategyId,
  WORKLOADS,
  type Workload,
} from "./types";

const WORKLOAD_LABELS: Record<Workload, string> = {
  read: "Read-heavy",
  mixed: "Mixed",
  write: "Write-heavy",
  race: "Racing writes",
  crash: "Cache crash",
};

export const CACHING_SECTIONS: FieldSection[] = [
  {
    title: "Strategy",
    fields: [
      {
        kind: "chips",
        key: "strategy",
        label: "Strategy",
        param: "st",
        hideLabel: true,
        options: STRATEGY_IDS.map((id) => ({ value: id, label: STRATEGIES[id].name })),
      },
    ],
  },
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "keys", label: "Keys", param: "k", min: 1, max: 3 },
      { kind: "slider", key: "length", label: "Requests", param: "n", min: 4, max: 12 },
      { kind: "slider", key: "lifetime", label: "Entry lifetime", param: "ttl", min: 2, max: 8 },
      { kind: "slider", key: "flushEvery", label: "Flush every", param: "fl", min: 2, max: 6 },
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
        hint: "R read · W write · X read ∥ write, then key A–E · ! crash. Enter to apply",
        resetBy: ["workload", "length", "keys", "seed"],
        parse: parseCachingSequence,
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

// Chosen for learning, not for variety: one key and six requests that show each strategy's defining behaviour.
const DEFAULTS = {
  strategy: "cache-aside",
  keys: 1,
  length: 6,
  lifetime: 5,
  flushEvery: 3,
  workload: "mixed",
  sequence: ["RA", "RA", "WA", "WA", "RA", "!"],
} as const;

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

function sliderBounds(key: string): { min: number; max: number } {
  const field = allFields(CACHING_SECTIONS).find((f) => f.kind === "slider" && f.key === key);
  if (!field || field.kind !== "slider") throw new Error(`missing slider field: ${key}`);
  return { min: field.min, max: field.max };
}

const KEYS_RANGE = sliderBounds("keys");
const LENGTH_RANGE = sliderBounds("length");
const LIFETIME_RANGE = sliderBounds("lifetime");
const FLUSH_RANGE = sliderBounds("flushEvery");

const clampSlider = (v: unknown, fallback: number, r: { min: number; max: number }): number =>
  clampInt(num(v, fallback), r.min, r.max);

export function toCachingInput(v: InputValues): CachingInput {
  const parsed = Array.isArray(v.sequence) ? parseCachingSequence(v.sequence.join("")) : null;
  return {
    strategy: STRATEGY_IDS.find((s) => s === v.strategy) ?? DEFAULTS.strategy,
    keys: clampSlider(v.keys, DEFAULTS.keys, KEYS_RANGE),
    length: clampSlider(v.length, DEFAULTS.length, LENGTH_RANGE),
    lifetime: clampSlider(v.lifetime, DEFAULTS.lifetime, LIFETIME_RANGE),
    flushEvery: clampSlider(v.flushEvery, DEFAULTS.flushEvery, FLUSH_RANGE),
    workload: WORKLOADS.find((w) => w === v.workload) ?? DEFAULTS.workload,
    seed: clampInt(num(v.seed, 0), 0, SEED_MAX),
    sequence: parsed?.ok ? parsed.tokens : null,
  };
}

const isStrategy = (s: string): s is StrategyId => STRATEGY_IDS.some((id) => id === s);

function availability(values: InputValues): Record<string, FieldAvailability> {
  const id = String(values.strategy);
  const def = isStrategy(id) ? STRATEGIES[id] : null;
  return {
    lifetime: def?.usesLifetime
      ? {}
      : { disabled: true, hint: "Used by read-through, write-around and refresh-ahead." },
    flushEvery: def?.usesFlush ? {} : { disabled: true, hint: "Used by write-behind." },
  };
}

function infoOf(def: StrategyDef): InfoContent {
  return {
    heading: "Strategy",
    name: def.name,
    chip: def.chip,
    rule: def.rule,
    about: def.about,
    tries: def.tries,
    articleHref: `${CACHING_ARTICLE}#${def.anchor}`,
  };
}

export const cachingModule: VisualizerModule = {
  slug: "caching-strategies",
  title: "Caching strategies",
  subtitle: "How data gets into a cache — and what goes wrong.",
  unit: "request",
  subject: "Cache",
  variants: { key: "strategy" },
  revision: cachingRevision(),
  sections: CACHING_SECTIONS,
  defaults: () => ({ ...DEFAULTS, sequence: [...DEFAULTS.sequence], seed: randomSeed() }),
  availability,
  run(values): RunResult {
    const input = toCachingInput(values);
    const tokens =
      input.sequence ?? generateSequence(input.workload, input.length, input.keys, input.seed);
    const def = STRATEGIES[input.strategy];
    return {
      frames: simulate(
        def,
        opsOf(tokens),
        { lifetime: input.lifetime, flushEvery: input.flushEvery },
        input.keys,
      ),
      info: infoOf(def),
      metricLabel: def.metricLabel,
      sequence: tokens,
    };
  },
};
