import { loadDataJson } from "@/lib/storage/data-json";

// Synonym expansion. Ported from js/search/search-features.js expandQuery + js/state.js synonymCache.
let map: Record<string, string[]> = {};
let loaded = false;

export async function loadSynonyms(): Promise<void> {
  if (loaded) return;
  map = await loadDataJson("synonyms");
  loaded = true;
}

export function expandQuery(query: string): string[] {
  const synonyms = map[query.toLowerCase()];
  return synonyms ? [query, ...synonyms] : [query];
}

export function _setSynonyms(next: Record<string, string[]>): void {
  map = next;
  loaded = true;
}
