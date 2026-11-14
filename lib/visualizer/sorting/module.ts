import type { FieldSection, InputValues } from "../core/fields";
import { randomSeed } from "../core/rng";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { DEFS } from "./defs";
import { toFrames } from "./frames";
import {
  DEFAULT_SEQUENCE,
  domainOf,
  makeValues,
  parseValues,
  tagItems,
  toSortInput,
} from "./input";
import { sortingRevision } from "./revision";
import { MAX_SIZE, MIN_SIZE, PRESETS, type Preset, SORT_IDS } from "./types";

const PRESET_LABELS: Record<Preset, string> = {
  random: "Random",
  "nearly-sorted": "Nearly sorted",
  reversed: "Reversed",
  duplicates: "Duplicates",
};

export const SORTING_SECTIONS: FieldSection[] = [
  {
    title: "Algorithm",
    fields: [
      {
        kind: "chips",
        key: "algo",
        label: "Algorithm",
        param: "a",
        hideLabel: true,
        options: SORT_IDS.map((id) => ({ value: id, label: DEFS[id].name })),
      },
    ],
  },
  {
    title: "Input",
    fields: [
      {
        kind: "chips",
        key: "preset",
        label: "Input",
        param: "pre",
        options: PRESETS.map((p) => ({ value: p, label: PRESET_LABELS[p] })),
      },
      { kind: "slider", key: "size", label: "Size", param: "n", min: MIN_SIZE, max: MAX_SIZE },
      {
        kind: "chips",
        key: "stable",
        label: "Stability tags",
        param: "t",
        options: [
          { value: "off", label: "Off" },
          { value: "on", label: "On" },
        ],
      },
      {
        kind: "sequence",
        key: "sequence",
        label: "Sequence",
        param: "q",
        maxLen: MAX_SIZE,
        hint: "Whole numbers, e.g. 5 2 4 6 · Enter to apply",
        resetBy: ["algo", "preset", "size", "seed"],
        parse: parseValues,
        join: ",",
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

function infoOf(id: (typeof SORT_IDS)[number]): InfoContent {
  const def = DEFS[id];
  return {
    heading: "Algorithm",
    name: def.name,
    chip: def.chip,
    rule: def.rule,
    about: def.about,
    tries: def.tries,
    articleHref: def.articleHref,
  };
}

export const sortingModule: VisualizerModule = {
  slug: "sorting",
  title: "Sorting",
  subtitle: "Watch each sort move the bars, one compare or swap at a time.",
  unit: "step",
  subject: "Array",
  variants: { key: "algo", restartOnSwitch: true },
  revision: sortingRevision(DEFS),
  sections: SORTING_SECTIONS,
  defaults: (): InputValues => ({
    algo: "insertion",
    preset: "random",
    size: 6,
    stable: "off",
    seed: randomSeed(),
    sequence: DEFAULT_SEQUENCE,
  }),
  run(values): RunResult {
    const input = toSortInput(values);
    const nums =
      input.values ?? makeValues(input.preset, input.size, input.seed, domainOf(input.algo));
    const def = DEFS[input.algo];
    return {
      frames: toFrames(def, def.steps(tagItems(nums, input.stable))),
      info: infoOf(input.algo),
      metricLabel: "Comparisons",
      sequence: nums.map(String),
    };
  },
};
