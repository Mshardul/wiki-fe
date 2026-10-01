import { PREFIXES } from "./keys";
import { getJSON, setJSON } from "./local";

export interface Highlight {
  id: string;
  start: number;
  end: number;
  snippet: string;
}

export interface Marker {
  id: string;
  offset: number;
  emoji: string;
  snippet: string;
}

export const MARKER_EMOJIS = ["🤔", "💡", "⭐", "🔁", "❓", "✅"] as const;

export const MARKER_LABELS: Record<string, string> = {
  "🤔": "confused",
  "💡": "insight",
  "⭐": "key",
  "🔁": "revisit",
  "❓": "question",
  "✅": "got-it",
};

const highlightsKeyFor = (wikiId: string, articlePath: string) =>
  `${PREFIXES.highlights}${wikiId}-${articlePath.replace(/\//g, "-")}`;
const markersKeyFor = (wikiId: string, articlePath: string) =>
  `${PREFIXES.markers}${wikiId}-${articlePath.replace(/\//g, "-")}`;

function makeId(prefix: string): string {
  return `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

export const Highlights = {
  getAll(wikiId: string, articlePath: string): Highlight[] {
    return getJSON<Highlight[]>(highlightsKeyFor(wikiId, articlePath), []);
  },
  add(
    wikiId: string,
    articlePath: string,
    entry: Pick<Highlight, "start" | "end" | "snippet">,
  ): Highlight {
    const key = highlightsKeyFor(wikiId, articlePath);
    const full: Highlight = { id: makeId("h"), ...entry };
    setJSON(key, [...getJSON<Highlight[]>(key, []), full]);
    return full;
  },
  remove(wikiId: string, articlePath: string, id: string): void {
    const key = highlightsKeyFor(wikiId, articlePath);
    setJSON(
      key,
      getJSON<Highlight[]>(key, []).filter((h) => h.id !== id),
    );
  },
};

export const Markers = {
  getAll(wikiId: string, articlePath: string): Marker[] {
    return getJSON<Marker[]>(markersKeyFor(wikiId, articlePath), []);
  },
  add(
    wikiId: string,
    articlePath: string,
    entry: Pick<Marker, "offset" | "emoji" | "snippet">,
  ): Marker {
    const key = markersKeyFor(wikiId, articlePath);
    const full: Marker = { id: makeId("m"), ...entry };
    setJSON(key, [...getJSON<Marker[]>(key, []), full]);
    return full;
  },
  remove(wikiId: string, articlePath: string, id: string): void {
    const key = markersKeyFor(wikiId, articlePath);
    setJSON(
      key,
      getJSON<Marker[]>(key, []).filter((m) => m.id !== id),
    );
  },
};
