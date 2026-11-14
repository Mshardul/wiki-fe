import type { LinearModel, ShapeModel } from "../core/shapes";
import type { Outcome, VarRow } from "../core/types";
import { COPY } from "./copy";
import {
  buildRun,
  extractRun,
  type HeapEvent,
  type HeapItem,
  heapsortRun,
  insertCost,
  insertRun,
  labelOf,
} from "./engine";
import { asItems } from "./input";
import { topKRun } from "./topk";
import { HEAP_IDS, type HeapDef, type HeapId, type HeapInput, type HeapStep } from "./types";
import { heapModelOf, mathsVarsOf, type TreeFrame } from "./view";

const GOOD = new Set([
  "Start",
  "Done",
  "Add",
  "Swap",
  "Swap root",
  "Take root",
  "Move last",
  "Evict",
  "Place",
  "Heap built",
]);
const outcomeOf = (badge: string): Outcome => (GOOD.has(badge) ? "good" : "bad");

const PATHS: Record<Exclude<HeapId, "heapsort" | "topk">, Record<string, number[]>> = {
  insert: { Add: [0], Compare: [1], Swap: [2], "In place": [3] },
  extract: {
    "Take root": [0],
    "Move last": [1],
    "Pick child": [2],
    Compare: [2],
    Swap: [3],
    "In place": [3],
  },
  build: { "Pick child": [1], Compare: [1], Swap: [1], "In place": [2] },
};

const vars = (
  node: number | null,
  size: number,
  counts: [string, number][],
  rest: VarRow[],
): VarRow[] => [
  { name: "node", value: node === null ? "—" : String(node) },
  { name: "size", value: String(size) },
  ...counts.map(([name, value]) => ({ name, value: String(value) })),
  ...rest,
];

function treeSteps(
  events: HeapEvent[],
  input: HeapInput,
  pathOf: (ev: HeapEvent, i: number) => number[],
  extra: VarRow[] = [],
): HeapStep[] {
  const capacity = input.values.length;
  const scale = Math.max(...input.values);
  return events.map((ev, i) => ({
    badge: ev.badge,
    caption: ev.caption,
    model: heapModelOf(ev, capacity, scale),
    metric: String(ev.comparisons),
    outcome: outcomeOf(ev.badge),
    vars: vars(
      ev.node,
      ev.size,
      [
        ["comparisons", ev.comparisons],
        ["swaps", ev.swaps],
      ],
      [...mathsVarsOf(ev), ...extra],
    ),
    path: pathOf(ev, i),
  }));
}

const lookup =
  (id: keyof typeof PATHS) =>
  (ev: HeapEvent): number[] =>
    PATHS[id][ev.badge] ?? [];

export function heapsortPath(events: HeapEvent[]): (ev: HeapEvent, i: number) => number[] {
  const built = events.findIndex((e) => e.badge === "Heap built");
  return (ev, i) => {
    if (ev.badge === "Heap built") return [0];
    if (ev.badge === "Swap root") return [1];
    if (ev.badge === "Start" || ev.badge === "Done") return [];
    return i < built ? [0] : [2];
  };
}

function topKSteps(input: HeapInput): HeapStep[] {
  const events = topKRun(asItems(input.values), input.k, input.order);
  const scale = Math.max(...input.values);
  let phase: "add" | "replace" = "add";
  return events.map((e) => {
    const frame: TreeFrame = {
      badge: e.badge,
      items: e.heap,
      size: e.heap.length,
      sortedFrom: e.heap.length,
      node: e.node,
      others: e.others,
      hole: e.hole,
      leaving: e.leaving,
      taken: [],
    };
    if (e.badge === "Add") phase = "add";
    if (e.badge === "Place") phase = "replace";
    let path: number[] = [];
    if (e.badge === "Read") path = [0];
    else if (e.badge === "Check root" || e.badge === "Skip") path = [2];
    else if (e.badge === "Evict" || e.badge === "Place") path = [3];
    else if (e.badge === "Add") path = [1];
    else if (e.badge !== "Start" && e.badge !== "Done") path = [phase === "add" ? 1 : 3];
    const key = (item: HeapItem | null) => (item ? labelOf(item) : null);
    const stream: LinearModel = {
      kind: "linear",
      items: e.stream.map(labelOf),
      capacity: input.values.length,
      next: null,
      active: key(e.reading),
      tone: e.reading ? "new" : null,
      removed: key(e.skipped),
      labels: { entry: "stream", exit: "read" },
      defaultAxis: "horizontal",
    };
    const model: ShapeModel = {
      kind: "composite",
      parts: [stream, heapModelOf(frame, input.k, scale)],
    };
    return {
      badge: e.badge,
      caption: e.caption,
      model,
      metric: String(e.comparisons),
      outcome: outcomeOf(e.badge),
      vars: vars(
        e.node,
        e.heap.length,
        [
          ["comparisons", e.comparisons],
          ["evictions", e.evictions],
        ],
        mathsVarsOf(frame),
      ),
      path,
    };
  });
}

const STEPS: Record<HeapId, (input: HeapInput) => HeapStep[]> = {
  insert: (input) =>
    treeSteps(insertRun(asItems(input.values), input.order), input, lookup("insert")),
  extract: (input) =>
    treeSteps(extractRun(asItems(input.values), input.order), input, lookup("extract")),
  build: (input) => {
    const items = asItems(input.values);
    const cost = insertCost(items, input.order);
    return treeSteps(buildRun(items, input.order), input, lookup("build"), [
      { name: "one by one: comparisons", value: String(cost.comparisons) },
      { name: "one by one: swaps", value: String(cost.swaps) },
    ]);
  },
  heapsort: (input) => {
    const events = heapsortRun(asItems(input.values), input.order);
    return treeSteps(events, input, heapsortPath(events));
  },
  topk: topKSteps,
};

function defOf(id: HeapId): HeapDef {
  const { name, chip, rule, lines, about, tries, articleHref } = COPY[id];
  return { id, name, chip, rule, lines, about, tries, articleHref, steps: STEPS[id] };
}

export const DEFS = Object.fromEntries(HEAP_IDS.map((id) => [id, defOf(id)])) as Record<
  HeapId,
  HeapDef
>;
