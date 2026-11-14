import type { FieldSection, InputValues } from "../core/fields";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { DEFS } from "./defs";
import { toFrames } from "./frames";
import { DEFAULT_SEQUENCE, parseValues, toHeapInput } from "./input";
import { heapRevision } from "./revision";
import { HEAP_IDS, type HeapId, MAX_K, MAX_VALUES, MIN_K } from "./types";

export const HEAP_SECTIONS: FieldSection[] = [
  {
    title: "Operation",
    fields: [
      {
        kind: "chips",
        key: "op",
        label: "Operation",
        param: "h",
        hideLabel: true,
        options: HEAP_IDS.map((id) => ({ value: id, label: DEFS[id].name })),
      },
    ],
  },
  {
    title: "Input",
    fields: [
      {
        kind: "chips",
        key: "order",
        label: "Heap type",
        param: "o",
        options: [
          { value: "min", label: "Min heap" },
          { value: "max", label: "Max heap" },
        ],
      },
      { kind: "slider", key: "k", label: "K, for Top-K", param: "k", min: MIN_K, max: MAX_K },
      {
        kind: "sequence",
        key: "sequence",
        label: "Values",
        param: "q",
        maxLen: MAX_VALUES,
        hint: "Whole numbers, e.g. 5 3 8 1 · Enter to apply",
        resetBy: [],
        parse: parseValues,
        join: ",",
      },
    ],
  },
];

function infoOf(id: HeapId): InfoContent {
  const def = DEFS[id];
  return {
    heading: "Operation",
    name: def.name,
    chip: def.chip,
    rule: def.rule,
    about: def.about,
    tries: def.tries,
    articleHref: def.articleHref,
  };
}

export const heapModule: VisualizerModule = {
  slug: "heap",
  title: "Heap",
  subtitle: "Watch the tree and its array change together, one compare or swap at a time.",
  unit: "step",
  subject: "Heap",
  variants: { key: "op", restartOnSwitch: true },
  revision: heapRevision(DEFS),
  sections: HEAP_SECTIONS,
  defaults: (): InputValues => ({
    op: "insert",
    order: "min",
    k: 3,
    sequence: DEFAULT_SEQUENCE,
  }),
  run(values): RunResult {
    const input = toHeapInput(values);
    const def = DEFS[input.op];
    return {
      frames: toFrames(def, def.steps(input)),
      info: infoOf(input.op),
      metricLabel: "Comparisons",
      sequence: input.values.map(String),
    };
  },
};
