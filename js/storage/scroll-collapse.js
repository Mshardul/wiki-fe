/* ═══════════════════════════════════════════════════════════════
   SCROLL CACHE EVICTION
   ═══════════════════════════════════════════════════════════════ */
const SCROLL_KEYS_MANIFEST = "wiki-scroll-keys";
const SCROLL_CACHE_MAX = 50;

// wikiId omitted clears every cached scroll position; passed, scopes to keys
// containing "-{wikiId}-" (manifest keys are TOC-scroll paths built from wikiId+article path).
function clearScrollPositions(wikiId) {
  let keys;
  try {
    keys = JSON.parse(localStorage.getItem(SCROLL_KEYS_MANIFEST) || "[]");
  } catch {
    keys = [];
  }
  const remove = wikiId ? keys.filter((k) => k.includes(`-${wikiId}-`)) : keys;
  remove.forEach((k) => localStorage.removeItem(k));
  const remaining = wikiId ? keys.filter((k) => !k.includes(`-${wikiId}-`)) : [];
  if (remaining.length) {
    localStorage.setItem(SCROLL_KEYS_MANIFEST, JSON.stringify(remaining));
  } else {
    localStorage.removeItem(SCROLL_KEYS_MANIFEST);
  }
}

function saveScrollPos(key, value) {
  let keys;
  try {
    keys = JSON.parse(localStorage.getItem(SCROLL_KEYS_MANIFEST) || "[]");
  } catch {
    keys = [];
  }
  keys = keys.filter((k) => k !== key);
  keys.unshift(key);
  while (keys.length > SCROLL_CACHE_MAX) {
    localStorage.removeItem(keys.pop());
  }
  localStorage.setItem(SCROLL_KEYS_MANIFEST, JSON.stringify(keys));
  localStorage.setItem(key, value);
}

/* ─── Collapse Helpers ─── */
function toggleCollapse(key, el, collapsed) {
  const next = collapsed !== undefined ? collapsed : !el.classList.contains("section--collapsed");
  if (next) {
    el.classList.add("section--collapsed");
    localStorage.setItem(key, "1");
  } else {
    el.classList.remove("section--collapsed");
    localStorage.removeItem(key);
  }
  return next;
}

function getCollapsed(key) {
  return !!localStorage.getItem(key);
}

/* ─── TOC Scroll Persistence ─── */
function saveTOCScroll(wikiId, articlePath, offset) {
  const key = `wiki-toc-scroll-${wikiId}-${articlePath.replace(/\//g, "-")}`;
  localStorage.setItem(key, String(offset));
}

function restoreTOCScroll(wikiId, articlePath) {
  const key = `wiki-toc-scroll-${wikiId}-${articlePath.replace(/\//g, "-")}`;
  return Number.parseInt(localStorage.getItem(key) || "0", 10);
}

/* ═══════════════════════════════════════════════════════════════
   RECENT SEARCHES
   ═══════════════════════════════════════════════════════════════ */
const RECENT_SEARCHES_KEY = "wiki-recent-searches";
const RECENT_SEARCHES_MAX = 10;

const RecentSearches = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    } catch {
      return [];
    }
  },
  add(query) {
    const q = query.trim();
    if (!q) return;
    let list = this.get().filter((s) => s !== q);
    list.unshift(q);
    if (list.length > RECENT_SEARCHES_MAX) list = list.slice(0, RECENT_SEARCHES_MAX);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  },
  remove(query) {
    const list = this.get().filter((s) => s !== query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  },
  clear() {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  },
};

export {
  saveScrollPos,
  toggleCollapse,
  getCollapsed,
  saveTOCScroll,
  restoreTOCScroll,
  RecentSearches,
  clearScrollPositions,
};
