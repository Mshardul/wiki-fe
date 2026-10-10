import { KEYS } from "./keys";
import { getJSON, setJSON } from "./local";

export interface PanelPrefs {
  left: boolean;
  right: boolean;
}

export function getVisualizerPanels(): PanelPrefs | null {
  const v = getJSON<unknown>(KEYS.visualizerPanels, null);
  if (typeof v !== "object" || v === null) return null;
  const { left, right } = v as Record<string, unknown>;
  return typeof left === "boolean" && typeof right === "boolean" ? { left, right } : null;
}

export function setVisualizerPanels(prefs: PanelPrefs): void {
  setJSON(KEYS.visualizerPanels, prefs);
}

type OrderMap = Record<string, string[]>;

function readOrders(): OrderMap {
  const v = getJSON<unknown>(KEYS.visualizerOrder, null);
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  const out: OrderMap = {};
  for (const [slug, ids] of Object.entries(v)) {
    if (Array.isArray(ids) && ids.every((id) => typeof id === "string")) out[slug] = ids;
  }
  return out;
}

export function getVisualizerOrder(slug: string): string[] | null {
  return readOrders()[slug] ?? null;
}

export function setVisualizerOrder(slug: string, order: string[]): void {
  setJSON(KEYS.visualizerOrder, { ...readOrders(), [slug]: order });
}

export function clearVisualizerOrder(slug: string): void {
  const next = readOrders();
  delete next[slug];
  setJSON(KEYS.visualizerOrder, next);
}
