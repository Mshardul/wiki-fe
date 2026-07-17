import { QuizMode } from "./content/tables.js";
import { navigateToContent } from "./render/content-view.js";
import { IndexFilter, fetchWikiIndex } from "./render/home-index.js";
import { normalizePath } from "./render/nav-utils.js";
import { navigate } from "./render/router.js";
import { showToast } from "./render/toast.js";
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
import { isRead, markRead, markUnread } from "./storage/read-tracking.js";
import { RecentSearches } from "./storage/scroll-collapse.js";
import { Settings } from "./storage/settings-theme.js";

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
const gSearchScopeCustom = document.querySelector(".gsearch-scope-custom");
const gSearchScopeBtn = document.querySelector(".gsearch-scope-btn");
const gSearchScopeLabel = document.querySelector(".gsearch-scope-label");
const gSearchScopeListbox = document.querySelector(".gsearch-scope-listbox");

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
  if (gSearchScopeSelect) {
    gSearchScopeSelect.innerHTML = `<option value="">All wikis</option>${WIKIS.map((w) => `<option value="${escHtml(w.id)}">${escHtml(w.title)}</option>`).join("")}`;
    gSearchScopeSelect.value = _searchScope || "";
  }
  if (gSearchScopeListbox) {
    const opts = [{ id: "", title: "All wikis" }, ...WIKIS];
    gSearchScopeListbox.innerHTML = opts
      .map(
        (w) =>
          `<button type="button" class="gsearch-scope-option" role="option" data-scope="${escHtml(w.id)}" aria-selected="${_searchScope === w.id || (!_searchScope && !w.id) ? "true" : "false"}">${escHtml(w.title)}</button>`,
      )
      .join("");
  }
  if (gSearchScopeLabel) {
    const active = _searchScope ? WIKIS.find((w) => w.id === _searchScope)?.title : "All wikis";
    gSearchScopeLabel.textContent = active || "All wikis";
  }
}

function _closeScopeListbox() {
  gSearchScopeListbox?.classList.add("hidden");
  gSearchScopeBtn?.setAttribute("aria-expanded", "false");
}

gSearchScopeSelect?.addEventListener("change", () => {
  _searchScope = gSearchScopeSelect.value || null;
  _syncModeBadge(gSearchInput.value);
  applyGlobalSearch(gSearchInput.value);
});

gSearchScopeBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = !gSearchScopeListbox?.classList.contains("hidden");
  if (isOpen) {
    _closeScopeListbox();
  } else {
    gSearchScopeListbox?.classList.remove("hidden");
    gSearchScopeBtn.setAttribute("aria-expanded", "true");
  }
});

gSearchScopeListbox?.addEventListener("click", (e) => {
  const opt = e.target.closest(".gsearch-scope-option");
  if (!opt) return;
  _searchScope = opt.dataset.scope || null;
  _closeScopeListbox();
  _populateScopeDropdown();
  _syncModeBadge(gSearchInput.value);
  applyGlobalSearch(gSearchInput.value);
});

document.addEventListener("click", (e) => {
  if (gSearchScopeCustom && !gSearchScopeCustom.contains(e.target)) {
    _closeScopeListbox();
  }
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

// Fuzzy-matches argText against section headings in the context wiki (same
// matching rule as the ">" section-filter seam) and returns a preview + run
// pair for the best-matching section, or null if nothing matches yet.
function _resolveSectionArg(argText, markAsRead) {
  const wiki = _contextWiki();
  if (!wiki || !argText) return null;

  const ql = argText.toLowerCase();
  const bySection = new Map();
  for (const entry of _entriesForWiki(wiki.id)) {
    const sectionLower = entry.section.toLowerCase();
    if (sectionLower.includes(ql) || fuzzyMatch(ql, sectionLower)) {
      if (!bySection.has(entry.section)) bySection.set(entry.section, []);
      bySection.get(entry.section).push(entry);
    }
  }
  if (!bySection.size) return null;

  // Prefer the shortest matching heading (closest to an exact match).
  const [section, entries] = [...bySection.entries()].sort((a, b) => a[0].length - b[0].length)[0];
  const changed = entries.filter((e) => isRead(e.path) !== markAsRead);

  return {
    preview: markAsRead
      ? `Mark ${entries.length} article${entries.length === 1 ? "" : "s"} in "${section}" as read`
      : `Mark ${entries.length} article${entries.length === 1 ? "" : "s"} in "${section}" as unread`,
    run() {
      const setRead = markAsRead ? markRead : markUnread;
      const setBack = markAsRead ? markUnread : markRead;
      changed.forEach((e) => setRead(e.path));
      showToast(
        `Marked ${changed.length} ${markAsRead ? "read" : "unread"} in "${section}"`,
        4000,
        () => {
          changed.forEach((e) => setBack(e.path));
          if (state.currentWikiId === wiki.id) navigate(wiki.id);
        },
      );
      if (state.currentWikiId === wiki.id) navigate(wiki.id);
    },
  };
}

// Resolves argText to the best-matching article in the context wiki, then
// navigates there and flips on quiz mode once the article has rendered.
// QuizMode.toggle() no-ops if the article has no complexity table.
function _resolveQuizArg(argText) {
  const wiki = _contextWiki();
  if (!wiki || !argText) return null;

  const entries = _entriesForWiki(wiki.id)
    .map((e) => ({ entry: e, score: scoreMatch(argText, e) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!entries.length) return null;

  const best = entries[0].entry;
  return {
    preview: `Quiz me on "${best.title}"`,
    run() {
      navigateToContent(
        best.wiki.id,
        encodeURIComponent(best.path),
        encodeURIComponent(best.title),
        best.slug,
      );
      const body = document.getElementById("markdown-body");
      delete body?.dataset.renderDone;
      const start = Date.now();
      const poll = setInterval(() => {
        if (document.getElementById("markdown-body")?.dataset.renderDone === "1") {
          clearInterval(poll);
          QuizMode.toggle();
        } else if (Date.now() - start > 5000) {
          clearInterval(poll);
        }
      }, 100);
    },
  };
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
    id: "mark-read",
    label: "Mark read…",
    hint: "Mark all articles in a section as read - type a section name",
    icon: "●",
    needsWiki: true,
    verb: "mark read ",
    resolveArg(argText) {
      return _resolveSectionArg(argText, /* markAsRead */ true);
    },
  },
  {
    id: "mark-unread",
    label: "Mark unread…",
    hint: "Mark all articles in a section as unread - type a section name",
    icon: "○",
    needsWiki: true,
    verb: "mark unread ",
    resolveArg(argText) {
      return _resolveSectionArg(argText, /* markAsRead */ false);
    },
  },
  {
    id: "quiz",
    label: "Quiz me on…",
    hint: "Jump to an article and start quiz mode - type a topic",
    icon: "?",
    needsWiki: true,
    verb: "quiz ",
    resolveArg(argText) {
      return _resolveQuizArg(argText);
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

// Holds the resolved { run } for the argument-taking command currently
// previewed, so runSearchCommand("__arg__") can execute exactly what's shown.
let _resolvedArgRun = null;

function applyCommandFilter(commandQuery) {
  const q = commandQuery.toLowerCase();

  // Verb mode: query starts with a known argument-command's verb + a space -
  // resolve the remainder against that command's argument space and show a
  // single live preview row instead of the command list.
  const verbCmd = availableCommands().find((c) => c.verb && q.startsWith(c.verb));
  if (verbCmd) {
    const argText = commandQuery.slice(verbCmd.verb.length).trim();
    const resolved = verbCmd.resolveArg(argText);
    gSearchCount.textContent = resolved ? "1 match" : "";
    if (!resolved) {
      _resolvedArgRun = null;
      gSearchResults.innerHTML = `<div class="gsearch-empty">${escHtml(verbCmd.hint)}</div>`;
      return;
    }
    _resolvedArgRun = resolved.run;
    gSearchResults.innerHTML = `
      <div class="gsearch-result gsearch-command" data-command="__arg__"
           role="button" tabindex="0"
           onclick="runSearchCommand('__arg__')"
           onkeydown="if(event.key==='Enter')this.click()">
        <span class="gsearch-command-icon" aria-hidden="true">${verbCmd.icon}</span>
        <span class="gsearch-result-title">${escHtml(resolved.preview)}</span>
        <span class="gsearch-result-meta">Press Enter to run</span>
      </div>`;
    return;
  }

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
    .map((c) => {
      const clickAction = c.verb
        ? `armSearchVerb(${escHtml(JSON.stringify(c.verb))})`
        : `runSearchCommand('${c.id}')`;
      return `
    <div class="gsearch-result gsearch-command" data-command="${c.id}"
         role="button" tabindex="0"
         onclick="${clickAction}"
         onkeydown="if(event.key==='Enter')this.click()">
      <span class="gsearch-command-icon" aria-hidden="true">${c.icon}</span>
      <span class="gsearch-result-title">${escHtml(c.label)}</span>
      <span class="gsearch-result-meta">${escHtml(c.hint)}</span>
    </div>`;
    })
    .join("");
}

// Populates the search input with "/<verb>" and re-filters, so the user can
// type the argument for a verb command selected from the base command list.
function armSearchVerb(verb) {
  gSearchInput.value = `/${verb}`;
  gSearchInput.focus();
  applyGlobalSearch(gSearchInput.value);
}

function runSearchCommand(id) {
  if (id === "__arg__") {
    if (!_resolvedArgRun) return;
    closeGlobalSearch();
    _resolvedArgRun();
    _resolvedArgRun = null;
    return;
  }
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

function _syncSearchViewportHeight() {
  if (!window.visualViewport) return;
  gSearchModal.style.setProperty("--gsearch-vvh", `${window.visualViewport.height}px`);
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
  // Synchronous focus for iOS (must run in user-gesture call stack); setTimeout(0) fallback covers non-gesture paths (e.g. iPad bluetooth ⌘K).
  gSearchInput.focus();
  setTimeout(() => gSearchInput.focus(), 0);
  _populateScopeDropdown();
  startPlaceholderHints();

  if (window.visualViewport) {
    _syncSearchViewportHeight();
    window.visualViewport.addEventListener("resize", _syncSearchViewportHeight);
  }

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
  _closeScopeListbox();
  gSearchModal.classList.add("hidden");
  gSearchModal.setAttribute("aria-hidden", "true");
  _searchScope = null;
  gSearchDialog?.classList.remove("scope-mode", "command-mode", "section-mode");
  stopPlaceholderHints();
  if (_searchFocusTrapHandler) {
    gSearchModal.removeEventListener("keydown", _searchFocusTrapHandler);
    _searchFocusTrapHandler = null;
  }
  if (window.visualViewport) {
    window.visualViewport.removeEventListener("resize", _syncSearchViewportHeight);
  }
  gSearchModal.style.removeProperty("--gsearch-vvh");
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

// Query may match only via synonym expansion (e.g. "map"->"hash table"); highlightMatch needs the matched term, not the typed query.
function titleHighlightTerm(title, highlightQuery) {
  if (!highlightQuery) return highlightQuery;
  const tl = title.toLowerCase();
  const terms = expandQuery(highlightQuery);
  return terms.find((term) => tl.includes(term.toLowerCase())) || highlightQuery;
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
      <span class="gsearch-result-title">${highlightMatch(item.title, titleHighlightTerm(item.title, highlightQuery))}</span>
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
    const q = raw.slice(1).toLowerCase();
    const verbCmd = availableCommands().find((c) => c.verb && q.startsWith(c.verb));
    gSearchModeBadge.textContent = verbCmd ? verbCmd.label.replace("…", "") : "Commands";
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
  armSearchVerb,
  saveSearchQuery,
  removeRecentSearchEntry,
  applyGlobalSearch,
};
