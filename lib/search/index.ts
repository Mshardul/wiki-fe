import { verticalRegistry } from "@/lib/content/verticals";
import { loadDataJson } from "@/lib/storage/data-json";
import type { SearchEntry } from "./score";

let cache: SearchEntry[] | null = null;

// Flattens the Node-built search-index.json into a flat entry list. Ported from
// js/render/home-parse.js search-entry building.
export async function loadSearchEntries(): Promise<SearchEntry[]> {
  if (cache) return cache;
  const [index] = await Promise.all([loadDataJson("search-index")]);
  const verticals = new Map(verticalRegistry().map((v) => [v.id, v.title]));

  const entries: SearchEntry[] = [];
  for (const [verticalId, sections] of Object.entries(index)) {
    const verticalTitle = verticals.get(verticalId) ?? verticalId;
    for (const section of sections) {
      for (const card of section.cards) {
        entries.push({
          title: card.title,
          path: card.path.replace(/^\.\//, ""),
          slug: card.slug,
          section: section.heading,
          description: card.description ?? "",
          verticalId,
          verticalTitle,
        });
      }
    }
  }
  cache = entries;
  return entries;
}

export function _resetSearchEntriesCache(): void {
  cache = null;
}

// Route for a search entry (basePath handled by next/link at the call site).
export function routeFor(entry: SearchEntry): string {
  const rest = entry.path.replace(/^content\/[^/]+\//, "").replace(/\.md$/, "");
  return `/${entry.verticalId}/${rest}/`;
}
