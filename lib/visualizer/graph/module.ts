import type { FieldAvailability, FieldSection, InputValues } from "../core/fields";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { DEFS } from "./defs";
import { toFrames } from "./frames";
import { PRESET_IDS, PRESETS, type PresetId } from "./graphs";
import { algoOf, effectivePreset, rawPresetOf, toGraphInput } from "./input";
import { graphRevision } from "./revision";
import { GRAPH_IDS, type GraphId, NODE_CHIPS } from "./types";

const PRESET_LABELS: Record<PresetId, string> = {
  small: "Small graph",
  weighted: "Weighted",
  dag: "DAG",
  "dag-cycle": "DAG with a cycle",
  "ring-even": "Even ring",
  "ring-odd": "Odd ring",
};

export const GRAPH_SECTIONS: FieldSection[] = [
  {
    title: "Algorithm",
    fields: [
      {
        kind: "chips",
        key: "algo",
        label: "Algorithm",
        param: "g",
        hideLabel: true,
        options: GRAPH_IDS.map((id) => ({ value: id, label: DEFS[id].name })),
      },
    ],
  },
  {
    title: "Input",
    fields: [
      {
        kind: "chips",
        key: "preset",
        label: "Graph",
        param: "gr",
        options: PRESET_IDS.map((id) => ({ value: id, label: PRESET_LABELS[id] })),
      },
      {
        kind: "chips",
        key: "start",
        label: "Start node",
        param: "st",
        options: NODE_CHIPS.map((n) => ({ value: n, label: n })),
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

const FALLBACK_HINT: Partial<Record<GraphId, string>> = {
  dijkstra: "Dijkstra runs on the weighted graph.",
  topo: "Topological sort runs on a directed graph.",
};

function infoOf(id: GraphId): InfoContent {
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

export const graphModule: VisualizerModule = {
  slug: "graph-traversals",
  title: "Graph Traversals",
  subtitle: "Watch each traversal walk the graph, one look at a neighbour at a time.",
  unit: "step",
  subject: "Graph",
  variants: { key: "algo", restartOnSwitch: true },
  revision: graphRevision(DEFS),
  sections: GRAPH_SECTIONS,
  defaults: (): InputValues => ({ algo: "bfs", preset: "small", start: "A", seed: 0 }),
  availability(values): Record<string, FieldAvailability> {
    const algo = algoOf(values);
    const raw = rawPresetOf(values);
    const eff = effectivePreset(algo, raw);
    const out: Record<string, FieldAvailability> = {};
    const hint = FALLBACK_HINT[algo];
    if (eff !== raw && hint) out.preset = { hint };
    if (algo === "topo") {
      out.start = { disabled: true, hint: "Starts from every node with no incoming arrow." };
    } else if (
      typeof values.start === "string" &&
      !PRESETS[eff].data.nodes.includes(values.start)
    ) {
      out.start = { hint: `No node ${values.start} in this graph; starting at A.` };
    }
    return out;
  },
  run(values): RunResult {
    const input = toGraphInput(values);
    const def = DEFS[input.algo];
    return {
      frames: toFrames(def, def.steps(input)),
      info: infoOf(input.algo),
      metricLabel: def.metricLabel,
      sequence: [],
    };
  },
};
