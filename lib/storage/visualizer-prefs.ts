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
