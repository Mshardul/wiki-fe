import { fuzzyMatch } from "./fuzzy";
import { expandQuery } from "./synonyms";

export interface SearchEntry {
  title: string;
  path: string;
  slug: string;
  section: string;
  description: string;
  verticalId: string;
  verticalTitle: string;
}

// Scoring ladder — ported exactly from js/search/search.js scoreMatch.
// title exact=100, startsWith=90, includes=80, fuzzy=60; (non-short) desc includes=40, desc fuzzy=20, section fuzzy=10.
export function scoreMatch(query: string, entry: SearchEntry): number {
  let best = 0;
  for (const term of expandQuery(query)) {
    const ql = term.toLowerCase();
    const title = entry.title.toLowerCase();
    const desc = (entry.description || "").toLowerCase();
    const short = ql.length <= 4;
    let score = 0;
    if (title === ql) score = 100;
    else if (title.startsWith(ql)) score = 90;
    else if (title.includes(ql)) score = 80;
    else if (fuzzyMatch(ql, title)) score = 60;
    else if (!short && desc.includes(ql)) score = 40;
    else if (!short && fuzzyMatch(ql, desc)) score = 20;
    else if (!short && fuzzyMatch(ql, entry.section.toLowerCase())) score = 10;
    if (score > best) best = score;
  }
  return best;
}

// Query may match only via a synonym; the highlighter needs the matched term, not the typed query.
export function titleHighlightTerm(title: string, query: string): string {
  if (!query) return query;
  const tl = title.toLowerCase();
  return expandQuery(query).find((t) => tl.includes(t.toLowerCase())) ?? query;
}

export interface Fallback {
  fuzzy: SearchEntry[];
  didYouMean: string | null;
}

// No-results fallback. Ported from js/search/search-features.js getFallbackSuggestions.
export function getFallbackSuggestions(query: string, entries: SearchEntry[]): Fallback {
  const expanded = expandQuery(query);
  let didYouMean: string | null = null;
  if (expanded.length > 1) {
    for (const alt of expanded.slice(1)) {
      if (entries.some((e) => scoreMatch(alt, e) > 0)) {
        didYouMean = alt;
        break;
      }
    }
  }

  const ql = query.toLowerCase();
  const fuzzy = entries
    .map((e) => {
      const title = e.title.toLowerCase();
      let qi = 0;
      for (let i = 0; i < title.length && qi < ql.length; i++) {
        if (title[i] === ql[qi]) qi++;
      }
      return { entry: e, score: qi === ql.length ? qi / title.length : 0 };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.entry);

  return { fuzzy, didYouMean };
}
