import { KEYS } from "./keys";
import { getJSON, makeSnapshot, setJSON, subscribeKey } from "./local";
import {
  type Accent,
  type Background,
  DARK_ACCENTS,
  DARK_BACKGROUNDS,
  DARK_TEXT_COLORS,
  LIGHT_ACCENTS,
  LIGHT_BACKGROUNDS,
  LIGHT_TEXT_COLORS,
  type TextColor,
} from "./settings-presets";

export interface Settings {
  backgroundId: string;
  textColorId: string;
  accentId: string;
  font: string;
  fontSize: "S" | "M" | "L";
  contentWidth: "Narrow" | "Default" | "Wide";
  lineHeight: "Tight" | "Normal" | "Relaxed";
  paraSpacing: "Tight" | "Normal" | "Relaxed";
  hapticFeedback: boolean;
  practiceAnswersHidden: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  backgroundId: "dark-void",
  textColorId: "text-crisp-dark",
  accentId: "indigo",
  font: "Inter",
  fontSize: "M",
  contentWidth: "Default",
  lineHeight: "Normal",
  paraSpacing: "Normal",
  hapticFeedback: false,
  practiceAnswersHidden: true,
};

const LIGHT_DEFAULTS: Partial<Settings> = {
  backgroundId: "light-white",
  textColorId: "text-crisp-light",
  accentId: "indigo-l",
};

export function isDark(backgroundId: string): boolean {
  return !backgroundId.startsWith("light-");
}

export function hasStoredSettings(): boolean {
  const stored = getJSON<Partial<Settings> | null>(KEYS.settings, null);
  return Boolean(stored?.backgroundId);
}

export function getSettings(): Settings {
  const stored = getJSON<Partial<Settings> | null>(KEYS.settings, null);
  if (stored?.backgroundId) return { ...DEFAULT_SETTINGS, ...stored };
  const prefersLight =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return prefersLight ? { ...DEFAULT_SETTINGS, ...LIGHT_DEFAULTS } : { ...DEFAULT_SETTINGS };
}

export function saveSettings(next: Settings): void {
  setJSON(KEYS.settings, next);
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  saveSettings(next);
  applySettings(next);
  return next;
}

export function subscribeSettings(cb: () => void): () => void {
  return subscribeKey(KEYS.settings, cb);
}

// Merge via getSettings(), or a fresh visit desyncs from the boot script's OS fallback.
const rawSnapshot = makeSnapshot<Partial<Settings> | null>(KEYS.settings, null);
let lastRaw: unknown;
let lastMerged: Settings = DEFAULT_SETTINGS;
export function getSettingsSnapshot(): Settings {
  const raw = rawSnapshot();
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastMerged = getSettings();
  }
  return lastMerged;
}

const pick = <T extends { id: string }>(list: T[], id: string): T =>
  list.find((x) => x.id === id) ?? (list[0] as T);

export function applySettings(s: Settings): void {
  if (typeof document === "undefined") return;
  const dark = isDark(s.backgroundId);
  const theme = dark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);

  const bg: Background = pick(dark ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS, s.backgroundId);
  const root = document.documentElement.style;
  root.setProperty("--bg", bg.bg);
  root.setProperty("--surface", bg.surface);
  root.setProperty("--surface-2", bg.surface2);
  root.setProperty("--surface-3", bg.surface3);
  root.setProperty("--border", bg.border);
  root.setProperty("--border-2", bg.border2);
  root.setProperty("--bg-translucent", bg.translucent);
  root.setProperty("--glass-bg", bg.translucent);
  root.setProperty("--glass-border", dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)");

  const tc: TextColor = pick(dark ? DARK_TEXT_COLORS : LIGHT_TEXT_COLORS, s.textColorId);
  root.setProperty("--text-heading", tc.heading);
  root.setProperty("--text-body", tc.body);

  const accent: Accent = pick(dark ? DARK_ACCENTS : LIGHT_ACCENTS, s.accentId);
  root.setProperty("--accent", accent.value);
  root.setProperty("--accent-light", accent.light);
  root.setProperty("--accent-dim", accent.dim);
  root.setProperty("--accent-glow", accent.glow);

  const font = s.font || "Inter";
  const serif = font === "Lora" || font === "Source Serif 4";
  const mono = font === "JetBrains Mono";
  const fallback = serif
    ? "Georgia, serif"
    : mono
      ? "monospace"
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  root.setProperty("--font", `"${font}", ${fallback}`);

  const sizes: Record<string, string> = { S: "87.5%", M: "100%", L: "112.5%" };
  document.documentElement.style.fontSize = sizes[s.fontSize] ?? "100%";

  const widths: Record<string, string> = { Narrow: "20%", Default: "10%", Wide: "5%" };
  root.setProperty("--layout-padding", widths[s.contentWidth] ?? "10%");

  const lineHeights: Record<string, string> = { Tight: "1.5", Normal: "1.7", Relaxed: "1.9" };
  root.setProperty("--line-height", lineHeights[s.lineHeight] ?? "1.7");

  const paraSpacings: Record<string, string> = {
    Tight: "0.5rem",
    Normal: "0.75rem",
    Relaxed: "1.25rem",
  };
  root.setProperty("--para-spacing", paraSpacings[s.paraSpacing] ?? "0.75rem");

  document.dispatchEvent(new CustomEvent("wiki:theme-changed", { detail: { theme } }));
}

export function bindOsThemeListener(): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const handler = () => {
    if (!hasStoredSettings()) applySettings(getSettings());
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
