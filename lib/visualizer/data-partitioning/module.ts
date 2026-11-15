import { type FieldSection, type InputValues } from "../core/fields";
import { randomSeed } from "../core/rng";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { COPY } from "./copy";
import { DEFAULT_EVENTS, DEFAULT_KEYS, DEFAULT_START } from "./defaults";
import { partitionFrames } from "./frames";
import { addAction, linkEvents, removeAction, startOf, toPartitionInput } from "./input";
import { parseEvents, parseKeys } from "./keys";
import { partitionRevision } from "./revision";
import {
  DEFAULT_VNODES,
  MAX_EVENTS,
  MAX_KEYS,
  MAX_NODES,
  MIN_NODES,
  SCHEME_IDS,
  type SchemeId,
  VNODE_CHOICES,
} from "./types";

export const PARTITION_SECTIONS: FieldSection[] = [
  {
    title: "Variant",
    fields: [
      {
        kind: "chips",
        key: "scheme",
        label: "Variant",
        param: "p",
        hideLabel: true,
        options: SCHEME_IDS.map((id) => ({ value: id, label: COPY[id].name })),
      },
    ],
  },
  {
    title: "Nodes",
    fields: [
      {
        kind: "slider",
        key: "nodes",
        label: "Node count",
        param: "n",
        min: MIN_NODES,
        max: MAX_NODES,
      },
      {
        kind: "action",
        key: "add",
        label: "Add node",
        apply: (v) => addAction(v),
      },
      {
        kind: "action",
        key: "remove",
        label: "Remove node",
        apply: (v) => removeAction(v),
      },
      {
        kind: "sequence",
        key: "events",
        label: "Events",
        param: "e",
        maxLen: MAX_EVENTS,
        hint: "+ adds · -B removes B · Enter to apply",
        resetBy: ["nodes"],
        resetEmpty: true,
        parse: (raw, values) => parseEvents(raw, startOf(values)),
        link: linkEvents,
        join: "_",
      },
      {
        kind: "chips",
        key: "vnodes",
        label: "Virtual nodes",
        param: "v",
        options: VNODE_CHOICES.map((n) => ({ value: String(n), label: String(n) })),
      },
    ],
  },
  {
    title: "Keys",
    fields: [
      {
        kind: "chips",
        key: "workload",
        label: "Workload",
        param: "w",
        options: [
          { value: "random", label: "Random" },
          { value: "sequential", label: "Sequential" },
          { value: "hot", label: "Hot key" },
        ],
      },
      {
        kind: "sequence",
        key: "keys",
        label: "Keys",
        param: "k",
        maxLen: MAX_KEYS,
        hint: "Numbers 0–99 · * marks the hot key · Enter to apply",
        resetBy: ["workload", "seed"],
        parse: parseKeys,
        join: "_",
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

function infoOf(id: SchemeId): InfoContent {
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

export const partitionModule: VisualizerModule = {
  slug: "data-partitioning",
  title: "Data Partitioning",
  subtitle: "Place keys on nodes, change the node count, and watch which keys move.",
  unit: "step",
  subject: "Partition",
  variants: { key: "scheme" },
  revision: partitionRevision(),
  sections: PARTITION_SECTIONS,
  defaults: (): InputValues => ({
    scheme: "mod-n",
    nodes: DEFAULT_START + DEFAULT_EVENTS.length,
    events: DEFAULT_EVENTS,
    vnodes: String(DEFAULT_VNODES),
    workload: "random",
    keys: DEFAULT_KEYS,
    seed: randomSeed(),
  }),
  availability: (values) => {
    const input = toPartitionInput(values);
    const nodes = input.start + input.events.reduce((n, t) => n + (t.startsWith("+") ? 1 : -1), 0);
    const full = input.events.length >= MAX_EVENTS;
    return {
      nodes: { hint: "Add and Remove change this; dragging starts over." },
      add:
        nodes >= MAX_NODES || full
          ? { disabled: true, hint: full ? "At most 4 events." : "Six nodes is the most." }
          : {},
      remove:
        nodes <= MIN_NODES || full
          ? { disabled: true, hint: full ? "At most 4 events." : "One node is the least." }
          : {},
      vnodes:
        input.scheme === "ring"
          ? { hint: "Positions come from a fixed table; real systems use 100–200." }
          : { disabled: true, hint: "Only the hash ring uses virtual nodes." },
    };
  },
  run(values): RunResult {
    const input = toPartitionInput(values);
    return {
      frames: partitionFrames(input),
      info: infoOf(input.scheme),
      metricLabel: "Keys moved",
      sequence: input.tokens,
      sequences: { keys: input.tokens, events: input.events },
    };
  },
};
