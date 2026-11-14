import { bucketSteps } from "./algos/bucket";
import { countingSteps } from "./algos/counting";
import { heapSteps } from "./algos/heap";
import { insertionSteps } from "./algos/insertion";
import { mergeSteps } from "./algos/merge";
import { quickSteps } from "./algos/quick";
import { radixSteps } from "./algos/radix";
import { selectionSteps } from "./algos/selection";
import { COPY } from "./copy";
import { type Item, SORT_IDS, type SortDef, type SortId, type SortStep } from "./types";

const STEPS: Record<SortId, (items: Item[]) => SortStep[]> = {
  insertion: insertionSteps,
  selection: selectionSteps,
  merge: mergeSteps,
  quick: quickSteps,
  heap: heapSteps,
  counting: countingSteps,
  radix: radixSteps,
  bucket: bucketSteps,
};

function defOf(id: SortId): SortDef {
  const { name, chip, rule, lines, about, tries, articleHref } = COPY[id];
  return { id, name, chip, rule, lines, about, tries, articleHref, steps: STEPS[id] };
}

export const DEFS = Object.fromEntries(SORT_IDS.map((id) => [id, defOf(id)])) as Record<
  SortId,
  SortDef
>;
