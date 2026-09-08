import { KEYS } from "./keys";
import { getJSON, makeSnapshot, remove, setJSON, subscribeKey } from "./local";

const MAX = 10;

// Recent search queries. Ported from js/storage/scroll-collapse.js RecentSearches.
export function getRecentSearches(): string[] {
  return getJSON<string[]>(KEYS.recentSearches, []);
}

export function addRecentSearch(query: string): void {
  const q = query.trim();
  if (!q) return;
  setJSON(KEYS.recentSearches, [q, ...getRecentSearches().filter((s) => s !== q)].slice(0, MAX));
}

export function removeRecentSearch(query: string): void {
  setJSON(
    KEYS.recentSearches,
    getRecentSearches().filter((s) => s !== query),
  );
}

export function clearRecentSearches(): void {
  remove(KEYS.recentSearches);
}

export function subscribeRecentSearches(cb: () => void): () => void {
  return subscribeKey(KEYS.recentSearches, cb);
}

export const getRecentSearchesSnapshot = makeSnapshot<string[]>(KEYS.recentSearches, []);
