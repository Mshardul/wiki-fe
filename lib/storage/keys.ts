// Canonical localStorage keys + prefixes, ported verbatim from the js/storage/* modules.
// Flat keys:
export const KEYS = {
  settings: "wiki-settings",
  bookmarks: "wiki-bookmarks",
  recents: "wiki-recents",
  recentSearches: "wiki-recent-searches",
  scrollKeysManifest: "wiki-scroll-keys",
  pinnedWikis: "wiki-pinned-wikis",
  indexViewMode: "wiki-index-view-mode",
  offlineCachedAt: "wiki-offline-cached-at",
  iosNudgeDismissed: "wiki-ios-install-nudge-dismissed",
  lastDarkPreset: "wiki-last-dark-preset",
  lastLightPreset: "wiki-last-light-preset",
} as const;

// Per-wiki / per-article keys (suffix is wikiId or `${wikiId}-${articlePath}`):
export const PREFIXES = {
  completed: "wiki-completed-",
  reveals: "wiki-reveals-",
  readDates: "wiki-read-dates-",
  highlights: "wiki-highlights-",
  markers: "wiki-markers-",
  notes: "wiki-notes-",
  notesCollapsed: "wiki-notes-collapsed-",
  tableCols: "wiki-table-cols-",
  headingCollapsed: "wiki-heading-collapsed-",
  sectionCollapsed: "wiki-section-collapsed-",
  tocScroll: "wiki-toc-scroll-",
  indexScroll: "wiki-index-scroll-",
} as const;

export type FlatKey = (typeof KEYS)[keyof typeof KEYS];

export const completionsKey = (wikiId: string) => `${PREFIXES.completed}${wikiId}`;
