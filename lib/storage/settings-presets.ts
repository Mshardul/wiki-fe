export interface Background {
  id: string;
  label: string;
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  border2: string;
  translucent: string;
}
export interface TextColor {
  id: string;
  label: string;
  heading: string;
  body: string;
}
export interface Accent {
  id: string;
  label: string;
  value: string;
  light: string;
  dim: string;
  glow: string;
}

export const DARK_BACKGROUNDS: Background[] = [
  {
    id: "dark-void",
    label: "Void",
    bg: "#0d1117",
    surface: "#151e2b",
    surface2: "#1c2640",
    surface3: "#232f4f",
    border: "#1e2d45",
    border2: "#27395a",
    translucent: "rgba(13,17,23,0.88)",
  },
  {
    id: "dark-slate",
    label: "Slate",
    bg: "#131929",
    surface: "#1a2236",
    surface2: "#222c44",
    surface3: "#2a3652",
    border: "#2a3652",
    border2: "#334060",
    translucent: "rgba(19,25,41,0.88)",
  },
  {
    id: "dark-dusk",
    label: "Dusk",
    bg: "#1a1528",
    surface: "#231d37",
    surface2: "#2c2545",
    surface3: "#352d53",
    border: "#352d53",
    border2: "#433860",
    translucent: "rgba(26,21,40,0.88)",
  },
];

export const LIGHT_BACKGROUNDS: Background[] = [
  {
    id: "light-white",
    label: "White",
    bg: "#f8fafc",
    surface: "#ffffff",
    surface2: "#f1f5f9",
    surface3: "#e2e8f0",
    border: "#e2e8f0",
    border2: "#cbd5e1",
    translucent: "rgba(248,250,252,0.92)",
  },
  {
    id: "light-cream",
    label: "Cream",
    bg: "#faf7f0",
    surface: "#ffffff",
    surface2: "#f5f0e6",
    surface3: "#ece5d8",
    border: "#e8e0d0",
    border2: "#d8ccbc",
    translucent: "rgba(250,247,240,0.92)",
  },
  {
    id: "light-fog",
    label: "Fog",
    bg: "#eef2f7",
    surface: "#f8fafc",
    surface2: "#e4eaf2",
    surface3: "#d6e0eb",
    border: "#c8d6e8",
    border2: "#b8c8d8",
    translucent: "rgba(238,242,247,0.92)",
  },
];

export const DARK_TEXT_COLORS: TextColor[] = [
  { id: "text-crisp-dark", label: "Crisp", heading: "#f1f5f9", body: "#cbd5e1" },
  { id: "text-soft-dark", label: "Soft", heading: "#b8cce0", body: "#8aa8c0" },
  { id: "text-warm-dark", label: "Warm", heading: "#e8d4b8", body: "#c4a882" },
];
export const LIGHT_TEXT_COLORS: TextColor[] = [
  { id: "text-crisp-light", label: "Crisp", heading: "#0f172a", body: "#334155" },
  { id: "text-soft-light", label: "Soft", heading: "#1e3050", body: "#476080" },
  { id: "text-warm-light", label: "Warm", heading: "#3d2c1e", body: "#6b503c" },
];

export const DARK_ACCENTS: Accent[] = [
  {
    id: "indigo",
    label: "Indigo",
    value: "#6366f1",
    light: "#818cf8",
    dim: "rgba(99,102,241,0.12)",
    glow: "rgba(99,102,241,0.25)",
  },
  {
    id: "cyan",
    label: "Cyan",
    value: "#06b6d4",
    light: "#22d3ee",
    dim: "rgba(6,182,212,0.12)",
    glow: "rgba(6,182,212,0.25)",
  },
  {
    id: "emerald",
    label: "Emerald",
    value: "#10b981",
    light: "#34d399",
    dim: "rgba(16,185,129,0.12)",
    glow: "rgba(16,185,129,0.25)",
  },
];
export const LIGHT_ACCENTS: Accent[] = [
  {
    id: "indigo-l",
    label: "Indigo",
    value: "#4f46e5",
    light: "#6366f1",
    dim: "rgba(79,70,229,0.1)",
    glow: "rgba(79,70,229,0.2)",
  },
  {
    id: "blue-l",
    label: "Blue",
    value: "#2563eb",
    light: "#3b82f6",
    dim: "rgba(37,99,235,0.1)",
    glow: "rgba(37,99,235,0.2)",
  },
  {
    id: "violet-l",
    label: "Violet",
    value: "#7c3aed",
    light: "#8b5cf6",
    dim: "rgba(124,58,237,0.1)",
    glow: "rgba(124,58,237,0.2)",
  },
];

export const FONT_OPTIONS = [
  { id: "Inter", label: "Inter" },
  { id: "Geist", label: "Geist" },
  { id: "IBM Plex Sans", label: "IBM Plex" },
  { id: "Lora", label: "Lora" },
  { id: "Source Serif 4", label: "Source Serif" },
  { id: "JetBrains Mono", label: "Mono" },
];
