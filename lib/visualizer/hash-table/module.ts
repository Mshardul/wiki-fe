import { type FieldSection, type InputValues } from "../core/fields";
import { randomSeed } from "../core/rng";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { DEFS } from "./defs";
import { toFrames } from "./frames";
import { KEYS_ERROR, PICKED, parseKeys, toHashInput } from "./input";
import { hashRevision } from "./revision";
import {
  DEFAULT_SIZE,
  HASH_IDS,
  type HashId,
  MAX_SIZE,
  MAX_TOKENS,
  MIN_SIZE,
  THRESHOLDS,
} from "./types";

export const HASH_SECTIONS: FieldSection[] = [
  {
    title: "Variant",
    fields: [
      {
        kind: "chips",
        key: "algo",
        label: "Variant",
        param: "a",
        hideLabel: true,
        options: HASH_IDS.map((id) => ({ value: id, label: DEFS[id].name })),
      },
    ],
  },
  {
    title: "Input",
    fields: [
      {
        kind: "chips",
        key: "keys",
        label: "Keys",
        param: "ks",
        options: [
          { value: "picked", label: "Picked" },
          { value: "random", label: "Random" },
        ],
      },
      {
        kind: "slider",
        key: "size",
        label: "Table size",
        param: "n",
        min: MIN_SIZE,
        max: MAX_SIZE,
      },
      {
        kind: "chips",
        key: "threshold",
        label: "Load limit",
        param: "lf",
        options: THRESHOLDS.map((t) => ({ value: t, label: t })),
      },
      {
        kind: "sequence",
        key: "sequence",
        label: "Keys",
        param: "q",
        maxLen: MAX_TOKENS,
        hint: "Numbers insert · -8 deletes · ?24 looks up · Enter to apply",
        resetBy: ["algo", "keys", "seed"],
        parse: parseKeys,
        join: ",",
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

function infoOf(id: HashId): InfoContent {
  const def = DEFS[id];
  return {
    heading: "Variant",
    name: def.name,
    chip: def.chip,
    rule: def.rule,
    about: def.about,
    tries: def.tries,
    articleHref: def.articleHref,
  };
}

export const hashTableModule: VisualizerModule = {
  slug: "hash-table",
  title: "Hash Table",
  subtitle: "Watch keys land in slots and see what happens when two collide.",
  unit: "step",
  subject: "Hash table",
  variants: { key: "algo", restartOnSwitch: true },
  revision: hashRevision(DEFS),
  sections: HASH_SECTIONS,
  defaults: (): InputValues => ({
    algo: "chaining",
    keys: "picked",
    size: DEFAULT_SIZE,
    threshold: "0.75",
    seed: randomSeed(),
    sequence: PICKED.chaining,
  }),
  availability: (values) => ({
    threshold: values.algo === "resize" ? {} : { disabled: true, hint: "Only Resize rehashes." },
    seed: values.keys === "random" ? {} : { disabled: true, hint: "Only used with random keys." },
  }),
  run(values): RunResult {
    const input = toHashInput(values);
    const def = DEFS[input.algo];
    return {
      frames: toFrames(def, def.steps(input)),
      info: infoOf(input.algo),
      metricLabel: def.metricLabel,
      sequence: input.tokens,
    };
  },
};

export { KEYS_ERROR };
