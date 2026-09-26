import { verticalRegistry } from "@/lib/content/verticals";
import { clearBookmarks } from "./bookmarks";
import { clearCompletions } from "./completions";
import { KEYS, PREFIXES } from "./keys";
import { remove } from "./local";
import { clearRecentSearches } from "./recent-searches";
import { clearRecents } from "./recents";

function removeByPrefix(prefix: string): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      try {
        localStorage.removeItem(key);
      } catch {
        // private mode / quota — the local layer is best-effort
      }
    }
  }
}

export interface DataCategory {
  key: string;
  label: string;
  clear: () => void;
}

export const DATA_CATEGORIES: DataCategory[] = [
  { key: "bookmarks", label: "Bookmarks", clear: () => clearBookmarks() },
  { key: "recents", label: "Recently visited", clear: () => clearRecents() },
  {
    key: "completions",
    label: "Completions & read dates",
    clear: () => {
      for (const v of verticalRegistry()) {
        clearCompletions(v.id);
        remove(`${PREFIXES.readDates}${v.id}`);
        remove(`${PREFIXES.reveals}${v.id}`);
      }
    },
  },
  {
    key: "scrollCollapse",
    label: "Scroll & collapse state",
    clear: () => {
      remove(KEYS.scrollKeysManifest);
      removeByPrefix(PREFIXES.headingCollapsed);
      removeByPrefix(PREFIXES.sectionCollapsed);
      removeByPrefix(PREFIXES.tocScroll);
      removeByPrefix(PREFIXES.indexScroll);
    },
  },
  {
    key: "tableColumns",
    label: "Table column preferences",
    clear: () => removeByPrefix(PREFIXES.tableCols),
  },
  { key: "recentSearches", label: "Recent searches", clear: () => clearRecentSearches() },
  {
    key: "highlightsNotes",
    label: "Highlights & notes",
    clear: () => {
      removeByPrefix(PREFIXES.highlights);
      removeByPrefix(PREFIXES.markers);
      removeByPrefix(PREFIXES.notes);
      removeByPrefix(PREFIXES.notesCollapsed);
    },
  },
  { key: "pinnedWikis", label: "Pinned wikis", clear: () => remove(KEYS.pinnedWikis) },
];

export function clearData(keys: string[]): void {
  for (const cat of DATA_CATEGORIES) if (keys.includes(cat.key)) cat.clear();
}
