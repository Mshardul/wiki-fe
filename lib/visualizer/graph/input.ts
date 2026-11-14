import { clampInt, type InputValues, SEED_MAX } from "../core/fields";
import { PRESET_IDS, PRESETS, type PresetId } from "./graphs";
import { GRAPH_IDS, type GraphId, type GraphInput } from "./types";

// Dijkstra needs weights and topological sort needs arrows; the rest take any graph.
export function effectivePreset(algo: GraphId, preset: PresetId): PresetId {
  if (algo === "dijkstra") return "weighted";
  if (algo === "topo") return preset === "dag" || preset === "dag-cycle" ? preset : "dag";
  return preset;
}

export const rawPresetOf = (v: InputValues): PresetId =>
  PRESET_IDS.find((id) => id === v.preset) ?? "small";

export const algoOf = (v: InputValues): GraphId => GRAPH_IDS.find((id) => id === v.algo) ?? "bfs";

export function toGraphInput(v: InputValues): GraphInput {
  const algo = algoOf(v);
  const preset = effectivePreset(algo, rawPresetOf(v));
  const nodes = PRESETS[preset].data.nodes;
  const start =
    typeof v.start === "string" && nodes.includes(v.start) ? v.start : (nodes[0] ?? "A");
  const seed = typeof v.seed === "number" && Number.isFinite(v.seed) ? v.seed : 0;
  return { algo, preset, start, seed: clampInt(seed, 0, SEED_MAX) };
}
