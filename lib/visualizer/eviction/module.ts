import { allFields, clampInt, type FieldSection, type InputValues, SEED_MAX } from "../core/fields";
import { randomSeed } from "../core/rng";
import type { ShapeModel } from "../core/shapes";
import type { InfoContent, RunResult, VisualizerModule, VizFrame } from "../core/types";
import { clock } from "./policies/clock";
import { fifo } from "./policies/fifo";
import { lfu } from "./policies/lfu";
import { lru } from "./policies/lru";
import { evictionRevision } from "./revision";
import { simulate } from "./simulate";
import { generateTrace } from "./trace";
import {
  type EvictionInput,
  PATTERNS,
  type Pattern,
  POLICY_IDS,
  type PolicyDef,
  type PolicyId,
  type PolicyMeta,
} from "./types";

export const CACHING_ARTICLE = "/system-design/components/caching/";

export interface PolicyEntry {
  empty: (capacity: number) => ShapeModel;
  meta: PolicyMeta;
  run: (capacity: number, trace: string[]) => VizFrame[];
}

const entry = <S>(def: PolicyDef<S>): PolicyEntry => ({
  meta: def,
  empty: (capacity) => def.model(def.init(capacity), "", false, null),
  run: (capacity, trace) => simulate(def, capacity, trace),
});

export const POLICIES: Record<PolicyId, PolicyEntry> = {
  lru: entry(lru),
  fifo: entry(fifo),
  lfu: entry(lfu),
  clock: entry(clock),
};

const PATTERN_LABELS: Record<Pattern, string> = {
  hot: "Hot set",
  scan: "Scan",
  loop: "Loop",
  uniform: "Uniform",
};

export const EVICTION_SECTIONS: FieldSection[] = [
  {
    title: "Policy",
    fields: [
      {
        kind: "chips",
        key: "policy",
        label: "Policy",
        param: "p",
        hideLabel: true,
        options: POLICY_IDS.map((id) => ({ value: id, label: POLICIES[id].meta.name })),
      },
    ],
  },
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "capacity", label: "Cache size", param: "c", min: 2, max: 8 },
      {
        kind: "chips",
        key: "pattern",
        label: "Access pattern",
        param: "pat",
        options: PATTERNS.map((p) => ({ value: p, label: PATTERN_LABELS[p] })),
      },
      { kind: "slider", key: "length", label: "Requests", param: "n", min: 10, max: 24 },
      {
        kind: "sequence",
        key: "sequence",
        label: "Sequence",
        param: "q",
        maxLen: 40,
        hint: "Edit keys A–Z, press Enter",
        resetBy: ["pattern", "length", "seed"],
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

function sliderBounds(key: string): { min: number; max: number } {
  const field = allFields(EVICTION_SECTIONS).find((f) => f.kind === "slider" && f.key === key);
  if (!field || field.kind !== "slider") throw new Error(`missing slider field: ${key}`);
  return { min: field.min, max: field.max };
}

const CAPACITY = sliderBounds("capacity");
const LENGTH = sliderBounds("length");

function clampSlider(
  v: unknown,
  fallback: number,
  { min, max }: { min: number; max: number },
): number {
  return clampInt(num(v, fallback), min, max);
}

export function toEvictionInput(v: InputValues): EvictionInput {
  return {
    policy: POLICY_IDS.find((p) => p === v.policy) ?? "lru",
    capacity: clampSlider(v.capacity, 4, CAPACITY),
    pattern: PATTERNS.find((p) => p === v.pattern) ?? "hot",
    length: clampSlider(v.length, 12, LENGTH),
    seed: clampInt(num(v.seed, 0), 0, SEED_MAX),
    sequence: Array.isArray(v.sequence) && v.sequence.length ? v.sequence : null,
  };
}

function infoOf(meta: PolicyMeta): InfoContent {
  return {
    heading: "Policy",
    name: meta.name,
    chip: meta.chip,
    rule: meta.rule,
    about: meta.about,
    tries: meta.tries,
    articleHref: `${CACHING_ARTICLE}#${meta.anchor}`,
  };
}

export const evictionModule: VisualizerModule = {
  slug: "eviction-policies",
  title: "Eviction policies",
  subtitle: "What a full cache throws out — and why.",
  unit: "request",
  subject: "Cache",
  variants: { key: "policy" },
  revision: evictionRevision(POLICIES),
  sections: EVICTION_SECTIONS,
  defaults: () => ({
    policy: "lru",
    capacity: 4,
    pattern: "hot",
    length: 12,
    seed: randomSeed(),
    sequence: null,
  }),
  run(values): RunResult {
    const input = toEvictionInput(values);
    const sequence =
      input.sequence ?? generateTrace(input.pattern, input.length, input.seed, input.capacity);
    const policy = POLICIES[input.policy];
    return {
      frames: policy.run(input.capacity, sequence),
      info: infoOf(policy.meta),
      metricLabel: "Hit rate",
      sequence,
    };
  },
};
