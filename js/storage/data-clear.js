import { setPinnedWikis } from "../render/home-index.js";
import { WIKIS } from "../state.js";
import { Bookmarks } from "./bookmarks.js";
import { Highlights, Markers } from "./highlights.js";
import { InterviewLog } from "./interview-mode.js";
import { Notes } from "./notes.js";
import { clearAllDownloads } from "./offline.js";
import { clearReadHistory } from "./read-tracking.js";
import { clearRecents } from "./recents.js";
import { RecentSearches, clearScrollPositions } from "./scroll-collapse.js";

/* ═══════════════════════════════════════════════════════════════
   SELECTIVE DATA CLEAR - orchestrates each domain module's own
   clear function; never touches localStorage/caches directly.
   ═══════════════════════════════════════════════════════════════ */

// category key -> { label, wikiScoped, clear(wikiId) }
const DATA_CATEGORIES = {
  bookmarks: {
    label: "Bookmarks",
    wikiScoped: true,
    clear: (wikiId) => (wikiId ? Bookmarks.clearWiki(wikiId) : Bookmarks.clearAll()),
  },
  recents: {
    label: "Recents",
    wikiScoped: true,
    clear: (wikiId) => clearRecents(wikiId),
  },
  readHistory: {
    label: "Read history",
    wikiScoped: true,
    clear: (wikiId) => clearReadHistory(wikiId),
  },
  offlineDownloads: {
    label: "Offline downloads",
    wikiScoped: true,
    clear: (wikiId) => clearAllDownloads(wikiId),
  },
  scrollPositions: {
    label: "Scroll positions",
    wikiScoped: true,
    clear: (wikiId) => clearScrollPositions(wikiId),
  },
  notes: {
    label: "Notes",
    wikiScoped: true,
    clear: (wikiId) => Notes.clear(wikiId),
  },
  highlights: {
    label: "Highlights & markers",
    wikiScoped: true,
    clear: (wikiId) => {
      Highlights.clear(wikiId);
      Markers.clear(wikiId);
    },
  },
  interviewLogs: {
    label: "Interview mode logs",
    wikiScoped: true,
    clear: (wikiId) => InterviewLog.clear(wikiId),
  },
  recentSearches: {
    label: "Recent searches",
    wikiScoped: false,
    clear: () => RecentSearches.clear(),
  },
  pinnedWikis: {
    label: "Pinned wikis",
    wikiScoped: false,
    clear: () => setPinnedWikis([]),
  },
};

// scope: 'all' clears every wiki-scoped category for every wiki; a wikiId scopes to that wiki. Global-only categories always clear fully.
function clearSelectedData(categories, scope) {
  for (const key of categories) {
    const category = DATA_CATEGORIES[key];
    if (!category) continue;
    if (!category.wikiScoped) {
      category.clear();
    } else if (scope === "all") {
      for (const wiki of WIKIS) category.clear(wiki.id);
    } else {
      category.clear(scope);
    }
  }
}

export { DATA_CATEGORIES, clearSelectedData };
