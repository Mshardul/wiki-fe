import {
  IndexFilter,
  fetchWikiIndex,
  navigate,
  navigateToContent,
  normalizePath,
  showToast,
} from "./render.js";
import {
  expandQuery,
  extractSnippet,
  getFallbackSuggestions,
  renderRecentSearches,
} from "./search-features.js";
import {
  WIKIS,
  allSearchCache,
  escHtml,
  fuzzyMatch,
  loadSynonyms,
  readTimeCache,
  state,
  synonymCache,
} from "./state.js";
import { RecentSearches, Settings, Theme, isRead, markRead, markUnread } from "./storage.js";

/* ═══════════════════════════════════════════════════════════════
   GLOBAL SEARCH (⌘K)
   ═══════════════════════════════════════════════════════════════ */
const gSearchModal = document.getElementById("global-search-modal");
const gSearchInput = document.getElementById("gsearch-input");
const gSearchResults = document.getElementById("gsearch-results");
const gSearchBackdrop = document.getElementById("gsearch-backdrop");
const gSearchCount = document.getElementById("gsearch-count");
const gSearchDialog = gSearchModal.querySelector(".gsearch-dialog");
const gSearchModeBadge = gSearchModal.querySelector(".gsearch-mode-badge");
const gSearchScopeSelect = document.getElementById("gsearch-scope-select");

/* null = global ⌘K; a wiki id = ⌘F scoped to that wiki */
let _searchScope = null;

function scopedEntries() {
  if (!_searchScope) return allSearchCache.entries;
  return allSearchCache.entries.filter((e) => e.wiki.id === _searchScope);
}

function scopedWiki() {
  return WIKIS.find((w) => w.id === _searchScope) || null;
}

function _populateScopeDropdown() {
  if (!gSearchScopeSelect) return;
  gSearchScopeSelect.innerHTML = `<option value="">All wikis</option>${WIKIS.map((w) => `<option value="${escHtml(w.id)}">${escHtml(w.title)}</option>`).join("")}`;
  gSearchScopeSelect.value = _searchScope || "";
}

gSearchScopeSelect?.addEventListener("change", () => {
  _searchScope = gSearchScopeSelect.value || null;
  _syncModeBadge(gSearchInput.value);
  applyGlobalSearch(gSearchInput.value);
});

/* ─── Command palette ("/" prefix) ─── */
function _contextWikiId() {
  return _searchScope || state.currentWikiId;
}

function _contextWiki() {
  const id = _contextWikiId();
  return WIKIS.find((w) => w.id === id) || null;
}

function _entriesForWiki(wikiId) {
  return allSearchCache.entries.filter((e) => e.wiki.id === wikiId);
}

const SEARCH_COMMANDS = [
  {
    id: "unread",
    label: "Show only unread",
    hint: "Filter the index to unread articles",
    icon: "○",
    needsWiki: true,
    run() {
      const wiki = _contextWiki();
      if (!wiki) return;
      IndexFilter.requestUnread();
      navigate(wiki.id);
    },
  },
  {
    id: "mark-all-read",
    label: "Mark all read",
    hint: "Mark every article in this wiki as read",
    icon: "●",
    needsWiki: true,
    run() {
      const wiki = _contextWiki();
      if (!wiki) return;
      const entries = _entriesForWiki(wiki.id);
      const changed = entries.filter((e) => !isRead(e.path));
      changed.forEach((e) => markRead(e.path));
      showToast(`Marked ${changed.length} read in ${wiki.title}`, 4000, () => {
        changed.forEach((e) => markUnread(e.path));
        if (state.currentWikiId === wiki.id) navigate(wiki.id);
      });
      if (state.currentWikiId === wiki.id) navigate(wiki.id);
    },
  },
  {
    id: "mark-all-unread",
    label: "Mark all unread",
    hint: "Mark every article in this wiki as unread",
    icon: "○",
    needsWiki: true,
    run() {
      const wiki = _contextWiki();
      if (!wiki) return;
      const entries = _entriesForWiki(wiki.id);
      const changed = entries.filter((e) => isRead(e.path));
      changed.forEach((e) => markUnread(e.path));
      showToast(`Marked ${changed.length} unread in ${wiki.title}`, 4000, () => {
        changed.forEach((e) => markRead(e.path));
        if (state.currentWikiId === wiki.id) navigate(wiki.id);
      });
      if (state.currentWikiId === wiki.id) navigate(wiki.id);
    },
  },
  {
    id: "export-bookmarks",
    label: "Export bookmarks",
    hint: "Download all app data as a JSON backup",
    icon: "↓",
    run() {
      Settings.exportData();
    },
  },
  {
    id: "clear-recents",
    label: "Clear recents",
    hint: "Remove the recently-visited list for this wiki",
    icon: "×",
    needsWiki: true,
    run() {
      const id = _contextWikiId();
      if (id) window.confirmClearRecents(id);
    },
  },
  {
    id: "clear-bookmarks",
    label: "Clear bookmarks",
    hint: "Remove all bookmarks for this wiki",
    icon: "×",
    needsWiki: true,
    run() {
      const id = _contextWikiId();
      if (id) window.confirmClearBookmarks(id);
    },
  },
  {
    id: "toggle-theme",
    label: "Toggle light / dark theme",
    hint: "Switch between light and dark",
    icon: "◐",
    run() {
      Theme.toggle();
    },
  },
  {
    id: "open-settings",
    label: "Open settings",
    hint: "Open the preferences panel",
    icon: "⚙",
    run() {
      Settings.openTab("general");
    },
  },
];

function availableCommands() {
  const hasWiki = !!_contextWikiId();
  return SEARCH_COMMANDS.filter((c) => !c.needsWiki || hasWiki);
}

function applyCommandFilter(commandQuery) {
  const q = commandQuery.toLowerCase();
  const cmds = availableCommands().filter(
    (c) => !q || c.label.toLowerCase().includes(q) || fuzzyMatch(q, c.label.toLowerCase()),
  );

  gSearchCount.textContent = cmds.length
    ? `${cmds.length} command${cmds.length === 1 ? "" : "s"}`
    : "";

  if (!cmds.length) {
    gSearchResults.innerHTML = `<div class="gsearch-no-results">No commands matching "<strong>${escHtml(
      commandQuery,
    )}</strong>"</div>`;
    return;
  }

  gSearchResults.innerHTML = cmds
    .map(
      (c) => `
    <div class="gsearch-result gsearch-command" data-command="${c.id}"
         role="button" tabindex="0"
         onclick="runSearchCommand('${c.id}')"
         onkeydown="if(event.key==='Enter')this.click()">
      <span class="gsearch-command-icon" aria-hidden="true">${c.icon}</span>
      <span class="gsearch-result-title">${escHtml(c.label)}</span>
      <span class="gsearch-result-meta">${escHtml(c.hint)}</span>
    </div>`,
    )
    .join("");
}

function runSearchCommand(id) {
  const cmd = SEARCH_COMMANDS.find((c) => c.id === id);
  if (!cmd) return;
  closeGlobalSearch();
  cmd.run();
}

async function loadAllSearchEntries() {
  if (allSearchCache.loaded || allSearchCache.loading) return;
  allSearchCache.loading = true;
  gSearchResults.innerHTML = '<div class="gsearch-loading">Loading…</div>';
  loadSynonyms();

  try {
    let anySucceeded = false;
    for (const wiki of WIKIS) {
      try {
        const sections = await fetchWikiIndex(wiki);
        const entries = [];
        for (const section of sections) {
          for (const card of section.cards) {
            entries.push({ wiki, section: section.heading, ...card });
          }
        }
        for (const entry of entries) {
          if (readTimeCache[normalizePath(entry.path)] !== null) {
            allSearchCache.entries.push(entry);
          }
        }
        anySucceeded = true;
      } catch {}
    }

    // Every wiki index failed → no usable cache.
    if (!anySucceeded) {
      gSearchResults.innerHTML =
        '<div class="gsearch-error">Couldn\'t load search index. ' +
        '<button type="button" class="gsearch-retry" onclick="retryGlobalSearch()">Retry</button></div>';
      return;
    }

    allSearchCache.loaded = true;
    applyGlobalSearch(gSearchInput.value);
  } finally {
    allSearchCache.loading = false;
  }
}

function retryGlobalSearch() {
  allSearchCache.loaded = false;
  allSearchCache.loading = false;
  loadAllSearchEntries();
}

let gSearchSelectedIdx = -1;
let _searchOpener = null;
let _searchFocusTrapHandler = null;

/* Rotating placeholder hints teach the search grammar one example at a time*/
const PLACEHOLDER_HINTS = [
  "try: trees",
  "try: heap",
  "try: bigO",
  "try: > graphs",
  "try: / commands",
  "try: dynamic programming",
];
const PLACEHOLDER_DEFAULT = "Search all wikis…";
const PLACEHOLDER_ROTATE_MS = 2800;
let _placeholderTimer = null;
let _placeholderIdx = 0;

function startPlaceholderHints() {
  stopPlaceholderHints();
  _placeholderIdx = 0;
  _placeholderTimer = setInterval(() => {
    if (gSearchInput.value) {
      stopPlaceholderHints();
      return;
    }
    gSearchInput.setAttribute("placeholder", PLACEHOLDER_HINTS[_placeholderIdx]);
    _placeholderIdx = (_placeholderIdx + 1) % PLACEHOLDER_HINTS.length;
  }, PLACEHOLDER_ROTATE_MS);
}

function stopPlaceholderHints() {
  if (_placeholderTimer) {
    clearInterval(_placeholderTimer);
    _placeholderTimer = null;
  }
  gSearchInput.setAttribute("placeholder", PLACEHOLDER_DEFAULT);
}

function gSearchItems() {
  return [...gSearchResults.querySelectorAll(".gsearch-result")];
}

function gSearchSelect(idx) {
  const items = gSearchItems();
  items.forEach((el) => el.classList.remove("selected"));
  if (idx < 0 || idx >= items.length) {
    gSearchSelectedIdx = -1;
    gSearchInput.focus();
    return;
  }
  gSearchSelectedIdx = idx;
  items[idx].classList.add("selected");
  items[idx].scrollIntoView({ block: "nearest" });
  items[idx].focus();
}

function openGlobalSearch(opts = {}) {
  _searchOpener = document.activeElement;
  _searchScope = opts.scope || null;
  gSearchModal.classList.remove("hidden");
  gSearchModal.setAttribute("aria-hidden", "false");
  gSearchInput.value = "";
  gSearchCount.textContent = "";
  gSearchSelectedIdx = -1;
  _syncModeBadge("");
  // Synchronous focus for iOS (must run in user-gesture call stack).
  // setTimeout(0) fallback covers non-gesture paths (e.g. iPad bluetooth ⌘K).
  gSearchInput.focus();
  setTimeout(() => gSearchInput.focus(), 0);
  _populateScopeDropdown();
  startPlaceholderHints();

  _searchFocusTrapHandler = (e) => {
    if (e.key !== "Tab") return;
    const items = [gSearchInput, ...gSearchItems()];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  if (_searchFocusTrapHandler) gSearchModal.removeEventListener("keydown", _searchFocusTrapHandler);
  gSearchModal.addEventListener("keydown", _searchFocusTrapHandler);

  if (allSearchCache.loaded) {
    applyGlobalSearch("");
  } else {
    gSearchResults.innerHTML = '<div class="gsearch-empty">Start typing to search…</div>';
    loadAllSearchEntries();
  }
}

function closeGlobalSearch() {
  gSearchModal.classList.add("hidden");
  gSearchModal.setAttribute("aria-hidden", "true");
  _searchScope = null;
  gSearchDialog?.classList.remove("scope-mode", "command-mode", "section-mode");
  stopPlaceholderHints();
  if (_searchFocusTrapHandler) {
    gSearchModal.removeEventListener("keydown", _searchFocusTrapHandler);
    _searchFocusTrapHandler = null;
  }
  if (_searchOpener && typeof _searchOpener.focus === "function") {
    _searchOpener.focus();
    _searchOpener = null;
  }
}

function scoreMatch(q, entry) {
  const terms = expandQuery(q);
  let best = 0;
  for (const term of terms) {
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

function renderResultItem(item, highlightQuery) {
  const snippet = highlightQuery ? extractSnippet(item.description || "", highlightQuery) : null;
  const snippetHtml = snippet ? `<span class="gsearch-result-snippet">${snippet}</span>` : "";
  const hqs = escHtml(JSON.stringify(highlightQuery || ""));
  return `
    <div class="gsearch-result"
         onclick="saveSearchQuery(${hqs}); closeGlobalSearch(); navigateToContent('${
           item.wiki.id
         }', '${encodeURIComponent(item.path)}', '${encodeURIComponent(
           item.title,
         )}', '${item.slug}')"
         role="button" tabindex="0"
         onkeydown="if(event.key==='Enter')this.click()">
      <span class="gsearch-result-title">${highlightMatch(item.title, highlightQuery)}</span>
      <span class="gsearch-result-meta">${escHtml(item.section)}</span>
      ${snippetHtml}
    </div>`;
}

function applySectionFilter(sectionQuery) {
  if (!sectionQuery) {
    gSearchResults.innerHTML = '<div class="gsearch-empty">Type a section name to filter…</div>';
    return;
  }

  const ql = sectionQuery.toLowerCase();
  const matched = {};
  for (const entry of scopedEntries()) {
    const sectionLower = entry.section.toLowerCase();
    if (sectionLower.includes(ql) || fuzzyMatch(ql, sectionLower)) {
      const key = `${entry.wiki.id}::${entry.section}`;
      if (!matched[key]) matched[key] = { wiki: entry.wiki, section: entry.section, items: [] };
      matched[key].items.push(entry);
    }
  }

  if (!Object.keys(matched).length) {
    gSearchResults.innerHTML = `<div class="gsearch-no-results">No sections matching "<strong>${escHtml(
      sectionQuery,
    )}</strong>"</div>`;
    return;
  }

  gSearchResults.innerHTML = Object.values(matched)
    .map(
      (g) => `
    <div class="gsearch-group-label">${highlightMatch(g.section, sectionQuery)}</div>
    ${g.items.map((item) => renderResultItem(item, "")).join("")}
  `,
    )
    .join("");
}

function _syncModeBadge(raw) {
  const commandMode = raw.startsWith("/");
  const sectionMode = raw.startsWith(">");
  gSearchDialog?.classList.toggle("command-mode", commandMode);
  gSearchDialog?.classList.toggle("section-mode", sectionMode);
  gSearchDialog?.classList.toggle("scope-mode", !!_searchScope);

  if (commandMode) {
    gSearchModeBadge.textContent = "Commands";
  } else if (sectionMode) {
    gSearchModeBadge.textContent = "Filtering sections";
  } else if (_searchScope) {
    const w = scopedWiki();
    gSearchModeBadge.textContent = w ? `${w.title} only` : "Scoped";
  }
}

function applyGlobalSearch(query) {
  gSearchSelectedIdx = -1;
  if (!allSearchCache.loaded) return;

  const raw = query.trim();
  _syncModeBadge(raw);

  if (raw.startsWith("/")) {
    applyCommandFilter(raw.slice(1).trimStart());
    return;
  }

  if (raw.startsWith(">")) {
    applySectionFilter(raw.slice(1).trimStart());
    return;
  }

  if (!raw) {
    gSearchCount.textContent = "";
    const recentsHtml = renderRecentSearches();
    const hint =
      '<div class="gsearch-empty">Type to search · <kbd class="gsearch-kbd">&gt;</kbd> sections · <kbd class="gsearch-kbd">/</kbd> commands</div>';
    gSearchResults.innerHTML = recentsHtml ? recentsHtml + hint : hint;
    return;
  }

  const q = raw;
  const scored = scopedEntries()
    .map((e) => ({ entry: e, score: scoreMatch(q, e) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.entry);

  if (!scored.length) {
    gSearchCount.textContent = "";
    const { fuzzy, didYouMean } = getFallbackSuggestions(q, scopedEntries(), scoreMatch);
    let fallbackHtml = `<div class="gsearch-no-results">No results for "<strong>${escHtml(q)}</strong>"</div>`;
    if (didYouMean) {
      const dymQs = escHtml(JSON.stringify(didYouMean));
      fallbackHtml += `<div class="gsearch-did-you-mean">Did you mean: <button class="gsearch-suggestion-btn" type="button" onclick="document.getElementById('gsearch-input').value=${dymQs};applyGlobalSearch(${dymQs})">${escHtml(didYouMean)}</button>?</div>`;
    }
    if (fuzzy.length) {
      fallbackHtml += `<div class="gsearch-group-label">You might be looking for</div>`;
      fallbackHtml += fuzzy.map((item) => renderResultItem(item, "")).join("");
    }
    gSearchResults.innerHTML = fallbackHtml;
    return;
  }

  gSearchCount.textContent = `${scored.length} result${scored.length === 1 ? "" : "s"}`;

  // Group by wiki, preserving score order within each group
  const grouped = {};
  for (const m of scored) {
    if (!grouped[m.wiki.id]) grouped[m.wiki.id] = { wiki: m.wiki, items: [] };
    grouped[m.wiki.id].items.push(m);
  }

  gSearchResults.innerHTML = Object.values(grouped)
    .map(
      (group) => `
    <div class="gsearch-group-label">${escHtml(group.wiki.title)}</div>
    ${group.items.map((item) => renderResultItem(item, q)).join("")}
  `,
    )
    .join("");
}

let _searchDebounceTimer;
gSearchInput.addEventListener("input", () => {
  clearTimeout(_searchDebounceTimer);
  _searchDebounceTimer = setTimeout(() => applyGlobalSearch(gSearchInput.value), 150);
});

gSearchInput.addEventListener("keydown", (e) => {
  const items = gSearchItems();
  if (!items.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    gSearchSelect(gSearchSelectedIdx < items.length - 1 ? gSearchSelectedIdx + 1 : 0);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    gSearchSelect(gSearchSelectedIdx > 0 ? gSearchSelectedIdx - 1 : items.length - 1);
  } else if (e.key === "Enter" && gSearchSelectedIdx >= 0) {
    e.preventDefault();
    items[gSearchSelectedIdx].click();
  }
});

gSearchResults.addEventListener("keydown", (e) => {
  const items = gSearchItems();
  if (!items.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    gSearchSelect(gSearchSelectedIdx < items.length - 1 ? gSearchSelectedIdx + 1 : 0);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (gSearchSelectedIdx <= 0) {
      gSearchSelectedIdx = -1;
      gSearchInput.focus();
    } else {
      gSearchSelect(gSearchSelectedIdx - 1);
    }
  }
});

gSearchBackdrop.addEventListener("click", closeGlobalSearch);

/* ─── Search result highlight ─── */
function highlightMatch(text, query) {
  if (!query) return escHtml(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escHtml(text);
  return `${escHtml(text.slice(0, idx))}<mark class="gsearch-highlight">${escHtml(text.slice(idx, idx + query.length))}</mark>${escHtml(text.slice(idx + query.length))}`;
}

function saveSearchQuery(query) {
  if (query) RecentSearches.add(query);
}

function removeRecentSearchEntry(query) {
  RecentSearches.remove(query);
  applyGlobalSearch(gSearchInput.value);
}

export {
  openGlobalSearch,
  closeGlobalSearch,
  retryGlobalSearch,
  runSearchCommand,
  saveSearchQuery,
  removeRecentSearchEntry,
  applyGlobalSearch,
};
