import {
  STUB_THRESHOLD,
  WIKIS,
  escHtml,
  fadeFactorForDaysSinceRead,
  markStubPath,
  readTimeCache,
  state,
  updatedDateCache,
} from "../state.js";
import { renderBookmarksSection } from "../storage/bookmarks.js";
import { isCompleted } from "../storage/completions.js";
import { listCachedArticlePaths } from "../storage/offline.js";
import { getLastOpened } from "../storage/read-tracking.js";
import { renderRecentsSection } from "../storage/recents.js";
import { toggleCollapse } from "../storage/scroll-collapse.js";
import { bindIndexCardSwipe, bindIndexPullToRefresh } from "./home-gestures.js";
import { parseIndexMd, updateArticleCounts } from "./home-parse.js";
import { destroyIndexGraph, renderIndexGraph } from "./index-graph.js";
import { renderLearningPathProgress } from "./learning-paths.js";
import {
  dirOf,
  fetchText,
  normalizePath,
  parseUpdatedDate,
  readingTime,
  setBreadcrumb,
} from "./nav-utils.js";
import { showView } from "./router.js";

/* ═══════════════════════════════════════════════════════════════
   PINNED WIKIS - local-only, no backend sync (home card order)
   ═══════════════════════════════════════════════════════════════ */
const PINNED_WIKIS_KEY = "wiki-pinned-wikis";

function getPinnedWikis() {
  try {
    return JSON.parse(localStorage.getItem(PINNED_WIKIS_KEY) || "[]");
  } catch {
    return [];
  }
}

function setPinnedWikis(ids) {
  localStorage.setItem(PINNED_WIKIS_KEY, JSON.stringify(ids));
}

function togglePinnedWiki(wikiId) {
  const pinned = getPinnedWikis();
  const next = pinned.includes(wikiId) ? pinned.filter((id) => id !== wikiId) : [...pinned, wikiId];
  setPinnedWikis(next);
  renderHome();
}

// Capture phase - must beat the ancestor .wiki-card's bubble-phase onclick=navigate(...).
document.addEventListener(
  "click",
  (e) => {
    const btn = e.target.closest("[data-pin-wiki-id]");
    if (!btn) return;
    e.stopPropagation();
    togglePinnedWiki(btn.dataset.pinWikiId);
  },
  { capture: true },
);

function _sortWikisByPin(wikis) {
  const pinned = getPinnedWikis();
  const pinnedSet = new Set(pinned);
  const pinnedWikis = pinned.map((id) => wikis.find((w) => w.id === id)).filter(Boolean);
  const restWikis = wikis.filter((w) => !pinnedSet.has(w.id));
  return [...pinnedWikis, ...restWikis];
}

/* ═══════════════════════════════════════════════════════════════
   VIEW 1 - HOME
   ═══════════════════════════════════════════════════════════════ */
function renderHome() {
  const grid = document.getElementById("wiki-grid");
  const pinnedSet = new Set(getPinnedWikis());
  grid.innerHTML = _sortWikisByPin(WIKIS)
    .map(
      (w) => `
    <div class="wiki-card${
      state.currentWikiId === w.id ? " active" : ""
    }" data-wiki-id="${w.id}" onclick="navigate('${w.id}')" role="button" tabindex="0"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();navigate('${
           w.id
         }')}">
      <button class="wiki-card-pin-btn${pinnedSet.has(w.id) ? " pinned" : ""}"
              data-pin-wiki-id="${w.id}"
              aria-label="${pinnedSet.has(w.id) ? "Unpin" : "Pin"} ${escHtml(w.title)}">${
                pinnedSet.has(w.id) ? "★" : "☆"
              }</button>
      <div class="wiki-card-icon">${w.icon}</div>
      <div class="wiki-card-body">
        <h2 class="wiki-card-title">${w.title}</h2>
        <p class="wiki-card-desc">${w.description}</p>
      </div>
      <div class="wiki-card-footer">
        <span class="wiki-card-count">0 articles</span>
        <span class="wiki-card-arrow">→</span>
      </div>
    </div>
  `,
    )
    .join("");

  state.tableResizeObservers.forEach((ro) => ro.disconnect());
  state.tableResizeObservers = [];
  state.preResizeObservers.forEach((ro) => ro.disconnect());
  state.preResizeObservers = [];

  showView("view-home");
  updateArticleCounts();
}

/* ═══════════════════════════════════════════════════════════════
   VIEW 2 - WIKI INDEX
   ═══════════════════════════════════════════════════════════════ */
async function renderIndex(wiki) {
  state.currentWikiId = wiki.id;

  setBreadcrumb("index-breadcrumb", [{ label: "Home", href: "#" }, { label: wiki.title }]);
  document.getElementById("index-title").textContent = wiki.title;
  document.getElementById("index-subtitle").textContent = wiki.description;

  showView("view-index");
  // view-index is exempt from _applyView's scroll reset (restores saved position below), so a fresh visit with nothing saved must reset here to avoid leaking the previous view's scroll.
  if (!localStorage.getItem(`wiki-index-scroll-${wiki.id}`)) {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  bindIndexCardSwipe(wiki);
  bindIndexPullToRefresh(wiki);
  renderRecentsSection(wiki);
  renderBookmarksSection(wiki);
  IndexFilter.reset();

  const sectionsEl = document.getElementById("index-sections");
  sectionsEl.innerHTML =
    '<div class="loading" style="padding:3rem;text-align:center;color:var(--text-muted);font-size:.875rem">Loading…</div>';

  try {
    const md = await fetchText(wiki.indexPath);
    const basePath = dirOf(wiki.indexPath);
    state.indexSections = parseIndexMd(md, basePath);
    renderIndexSections(state.indexSections, wiki);
    for (const section of state.indexSections) renderLearningPathProgress(section, wiki);
    renderIndexControls(wiki);
    attachIndexCardKeyNav();
    IndexFilter.apply();
    _wireOfflineDimming();
    applyOfflineDimming(wiki);

    const savedScroll = localStorage.getItem(`wiki-index-scroll-${wiki.id}`);
    const targetY = savedScroll ? Number.parseInt(savedScroll, 10) : null;

    sectionsEl.classList.add("index-sections--loading");
    const scheduleIdle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1));
    scheduleIdle(() =>
      populateIndexReadTimes().finally(() => {
        sectionsEl.classList.remove("index-sections--loading");
        // Restore scroll only after read-time/stub badges settle - restoring earlier risks the browser clamping targetY to a still-short page.
        if (targetY !== null) window.scrollTo({ top: targetY, behavior: "instant" });
      }),
    );
  } catch (err) {
    sectionsEl.innerHTML = `<p class="error">Failed to load index. (${escHtml(err.message)})</p>`;
  }
}

function renderIndexSections(sections, wiki) {
  const container = document.getElementById("index-sections");
  container.innerHTML = sections
    .map((section) => {
      const collapseKey = `wiki-section-collapsed-${wiki.id}-${section.heading}`;
      const isCollapsed = !!localStorage.getItem(collapseKey);
      const escapedHeading = section.heading.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      return `
    <div class="index-section${
      isCollapsed ? " section--collapsed" : ""
    }" data-section="${escHtml(section.heading)}">
      <div class="section-header"
           role="button" tabindex="0"
           aria-expanded="${isCollapsed ? "false" : "true"}"
           onclick="toggleSection(this,'${wiki.id}','${escapedHeading}')"
           onkeydown="if(event.key==='Enter'||event.key===' '){toggleSection(this,'${
             wiki.id
           }','${escapedHeading}');event.preventDefault()}">
        <h2 class="section-title">${escHtml(section.heading)}</h2>
        <span class="section-count">${section.cards.length}</span>
        <span class="section-chevron">›</span>
      </div>
      <div class="index-card-grid">
        <p class="index-section-empty">No articles available in this section yet.</p>
        ${section.cards
          .map(
            (card) => `
          <div class="index-card"
               data-title="${escHtml(card.title)}"
               data-desc="${escHtml(card.description)}"
               aria-label="${escHtml(card.title)}"
               onclick="navigateToContent('${wiki.id}', '${encodeURIComponent(
                 card.path,
               )}', '${encodeURIComponent(card.title)}', '${card.slug}')"
               role="button" tabindex="0"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
            <div class="index-card-header">
              <span class="index-card-title">${escHtml(card.title)}</span>
              <span class="index-card-arrow">→</span>
            </div>
            <p class="index-card-desc">${escHtml(card.description)}</p>
            <div class="index-card-meta">
              <span class="index-card-read-time" data-path="${escHtml(card.path)}">…</span>
              <span class="index-card-read-dot ${
                isCompleted(normalizePath(card.path), wiki.id) ? "visible" : ""
              }" title="Completed"></span>
              <span class="index-card-updated-dot" title="Updated since you last read it"></span>
            </div>
            <span class="index-card-swipe-hint" aria-hidden="true"></span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
    })
    .join("");
}

// Dims index cards not cached for offline reading; no-op (and clears prior dimming) when online.
async function applyOfflineDimming(wiki) {
  const container = document.getElementById("index-sections");
  if (!container) return;

  if (!navigator.onLine) {
    const byWiki = await listCachedArticlePaths();
    const cached = new Set(byWiki[wiki.id] || []);
    container.querySelectorAll(".index-card[onclick]").forEach((card) => {
      const path = card.querySelector(".index-card-read-time[data-path]")?.dataset.path;
      const normalized = path ? normalizePath(path) : null;
      card.classList.toggle(
        "index-card--offline-uncached",
        !!normalized && !cached.has(normalized),
      );
    });
  } else {
    container
      .querySelectorAll(".index-card--offline-uncached")
      .forEach((card) => card.classList.remove("index-card--offline-uncached"));
  }
}

// Re-resolves wiki from state.currentWikiId at fire time (not closed over) so switching indexes doesn't dim the wrong wiki.
let _offlineDimWired = false;
function _wireOfflineDimming() {
  if (_offlineDimWired) return;
  _offlineDimWired = true;
  const reapply = () => {
    if (state.currentView !== "index") return;
    const wiki = WIKIS.find((w) => w.id === state.currentWikiId);
    if (wiki) applyOfflineDimming(wiki);
  };
  window.addEventListener("online", reapply);
  window.addEventListener("offline", reapply);
}

const INDEX_VIEW_MODE_KEY = "wiki-index-view-mode";

function renderIndexControls(wiki) {
  document.getElementById("index-controls")?.remove();

  const subtitle = document.getElementById("index-subtitle");
  if (!subtitle) return;

  const controls = document.createElement("div");
  controls.id = "index-controls";
  controls.className = "index-controls";

  const isGraphMode = localStorage.getItem(INDEX_VIEW_MODE_KEY) === "graph";

  controls.innerHTML = `
    <button id="index-collapse-all" class="index-ctrl-btn" title="Collapse all sections" aria-label="Collapse all sections">
      <svg class="icon"><use href="#icon-collapse-all"></use></svg>
    </button>
    <button id="index-expand-all" class="index-ctrl-btn" title="Expand all sections" aria-label="Expand all sections">
      <svg class="icon"><use href="#icon-expand-all"></use></svg>
    </button>
    <button id="index-view-toggle" class="index-ctrl-btn" title="${
      isGraphMode ? "Switch to list view" : "Switch to graph view"
    }" aria-label="${
      isGraphMode ? "Switch to list view" : "Switch to graph view"
    }" aria-pressed="${isGraphMode}">
      <svg class="icon"><use href="#icon-grid"></use></svg>
    </button>
  `;

  subtitle.insertAdjacentElement("afterend", controls);

  controls.querySelector("#index-collapse-all").addEventListener("click", () => {
    document.querySelectorAll(".index-section").forEach((section) => {
      const heading = section.dataset.section;
      const key = `wiki-section-collapsed-${wiki.id}-${heading}`;
      toggleCollapse(key, section, true);
      animateGridHeight(section, true);
    });
  });

  controls.querySelector("#index-expand-all").addEventListener("click", () => {
    document.querySelectorAll(".index-section").forEach((section) => {
      const heading = section.dataset.section;
      const key = `wiki-section-collapsed-${wiki.id}-${heading}`;
      toggleCollapse(key, section, false);
      animateGridHeight(section, false);
    });
  });

  controls.querySelector("#index-view-toggle").addEventListener("click", () => {
    const next = localStorage.getItem(INDEX_VIEW_MODE_KEY) === "graph" ? "list" : "graph";
    localStorage.setItem(INDEX_VIEW_MODE_KEY, next);
    applyIndexViewMode(wiki);
  });

  applyIndexViewMode(wiki);
}

function applyIndexViewMode(wiki) {
  const sectionsEl = document.getElementById("index-sections");
  const graphWrap = document.getElementById("index-graph-wrap");
  const toggleBtn = document.getElementById("index-view-toggle");
  if (!sectionsEl || !graphWrap) return;

  const isGraphMode = localStorage.getItem(INDEX_VIEW_MODE_KEY) === "graph";
  sectionsEl.classList.toggle("hidden", isGraphMode);
  graphWrap.classList.toggle("hidden", !isGraphMode);
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-pressed", String(isGraphMode));
    const label = isGraphMode ? "Switch to list view" : "Switch to graph view";
    toggleBtn.title = label;
    toggleBtn.setAttribute("aria-label", label);
  }

  if (isGraphMode) {
    renderIndexGraph(state.indexSections, wiki);
  } else {
    destroyIndexGraph();
  }
}

function attachIndexCardKeyNav() {
  if (document._indexCardKeyNav) {
    document.removeEventListener("keydown", document._indexCardKeyNav);
  }

  document._indexCardKeyNav = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;

    const focused = document.activeElement;
    if (!focused) return;
    const card = focused.closest(".index-card");
    if (!card) return;

    const container = document.getElementById("index-sections");
    if (!container || !container.contains(card)) return;

    if (e.key === "Enter") {
      e.preventDefault();
      card.click();
      return;
    }

    e.preventDefault();
    const section = card.closest(".index-section");
    if (!section) return;
    const sectionCards = Array.from(section.querySelectorAll(".index-card"));
    const idx = sectionCards.indexOf(card);
    if (idx === -1) return;

    if (e.key === "ArrowDown" && idx < sectionCards.length - 1) {
      sectionCards[idx + 1].focus();
    } else if (e.key === "ArrowUp" && idx > 0) {
      sectionCards[idx - 1].focus();
    }
  };

  document.addEventListener("keydown", document._indexCardKeyNav);
}

/* ═══════════════════════════════════════════════════════════════
   INDEX FILTER - live text filter + completion-status toggle
   ═══════════════════════════════════════════════════════════════ */
const IndexFilter = {
  _query: "",
  _completionStatus: "all", // "all" | "completed" | "incomplete"
  _pendingIncomplete: false,
  _debounce: null,

  /* applied on the next index render - lets a command arm it before navigating */
  requestIncomplete() {
    this._pendingIncomplete = true;
  },

  reset() {
    this._query = "";
    this._completionStatus = this._pendingIncomplete ? "incomplete" : "all";
    this._pendingIncomplete = false;
    const input = document.getElementById("index-filter-input");
    if (input) input.value = "";
    this._syncCompletionSelect();
  },

  hasActiveFilter() {
    return !!this._query || this._completionStatus !== "all";
  },

  // Full clear for the reset-view escape hatch - unlike reset(), also drops the completion filter instead of honouring a pending request.
  clearAll() {
    this._query = "";
    this._completionStatus = "all";
    this._pendingIncomplete = false;
    const input = document.getElementById("index-filter-input");
    if (input) input.value = "";
    this._syncCompletionSelect();
    this.apply();
  },

  _syncCompletionSelect() {
    const select = document.getElementById("index-filter-read-select");
    if (select) select.value = this._completionStatus;
  },

  setQuery(q) {
    this._query = q.trim().toLowerCase();
    this.apply();
  },

  setCompletionStatus(status) {
    this._completionStatus = status;
    this.apply();
  },

  apply() {
    const sections = document.querySelectorAll("#index-sections .index-section");
    sections.forEach((sectionEl) => {
      let visible = 0;
      sectionEl.querySelectorAll(".index-card").forEach((card) => {
        const title = (card.dataset.title || "").toLowerCase();
        const desc = (card.dataset.desc || "").toLowerCase();
        const rawPath = card.querySelector(".index-card-read-time[data-path]")?.dataset.path;
        const path = rawPath ? normalizePath(rawPath) : null;
        const matchesText =
          !this._query || title.includes(this._query) || desc.includes(this._query);
        const completed = path ? isCompleted(path, state.currentWikiId) : false;
        const matchesCompletionStatus =
          this._completionStatus === "all" ||
          (this._completionStatus === "completed" && completed) ||
          (this._completionStatus === "incomplete" && !completed);
        const show = matchesText && matchesCompletionStatus;
        card.classList.toggle("index-card--filtered", !show);
        if (show) visible++;
      });
      sectionEl.classList.toggle("index-section--no-matches", visible === 0);
    });
  },
};

const _indexFilterInput = document.getElementById("index-filter-input");
if (_indexFilterInput) {
  _indexFilterInput.addEventListener("input", () => {
    clearTimeout(IndexFilter._debounce);
    IndexFilter._debounce = setTimeout(() => IndexFilter.setQuery(_indexFilterInput.value), 120);
  });
}
const _indexFilterReadSelect = document.getElementById("index-filter-read-select");
if (_indexFilterReadSelect) {
  _indexFilterReadSelect.addEventListener("change", () => {
    IndexFilter.setCompletionStatus(_indexFilterReadSelect.value);
  });
}

function animateGridHeight(section, collapsed) {
  const grid = section.querySelector(".index-card-grid");
  if (!grid) return;
  if (collapsed) {
    grid.style.height = `${grid.scrollHeight}px`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (section.classList.contains("section--collapsed")) grid.style.height = "0px";
      });
    });
  } else {
    const target = grid.scrollHeight;
    grid.style.height = `${target}px`;
    const clear = () => {
      if (!section.classList.contains("section--collapsed")) grid.style.height = "";
    };
    const duration = Number.parseFloat(getComputedStyle(grid).transitionDuration) || 0;
    if (duration === 0) {
      clear();
    } else {
      grid.addEventListener("transitionend", clear, { once: true });
    }
  }
}

function toggleSection(headerEl, wikiId, heading) {
  const section = headerEl.closest(".index-section");
  const key = `wiki-section-collapsed-${wikiId}-${heading}`;
  const nowCollapsed = toggleCollapse(key, section);
  animateGridHeight(section, nowCollapsed);
  headerEl.setAttribute("aria-expanded", nowCollapsed ? "false" : "true");
}

// Only meaningful once there's a prior visit to compare against - never opened means no baseline.
function _applyUpdatedDot(card, path, updatedDate) {
  const dot = card.querySelector(".index-card-updated-dot");
  if (!dot) return;
  const lastOpened = getLastOpened(path);
  const isNewer = !!lastOpened && !!updatedDate && new Date(updatedDate) > new Date(lastOpened);
  dot.classList.toggle("visible", isNewer);
}

// Ambient memory-decay cue - only completed articles with a recorded visit fade; incomplete cards stay at full opacity.
function _applyFade(card, path) {
  const lastOpened = getLastOpened(path);
  if (!isCompleted(path, state.currentWikiId) || !lastOpened) {
    card.style.removeProperty("--fade");
    return;
  }
  const daysSince = (Date.now() - new Date(lastOpened).getTime()) / 86_400_000;
  card.style.setProperty("--fade", fadeFactorForDaysSinceRead(daysSince));
}

async function populateIndexReadTimes() {
  const badges = Array.from(document.querySelectorAll(".index-card-read-time[data-path]"));

  await Promise.all(
    badges.map(async (badge) => {
      const rawPath = badge.dataset.path;
      if (!rawPath) return;
      const path = normalizePath(rawPath);
      try {
        let md;
        if (readTimeCache[path] === undefined || updatedDateCache[path] === undefined) {
          md = await fetchText(rawPath);
          if (readTimeCache[path] === undefined) {
            if (md.length < STUB_THRESHOLD) markStubPath(path);
            else readTimeCache[path] = readingTime(md);
          }
          if (updatedDateCache[path] === undefined) updatedDateCache[path] = parseUpdatedDate(md);
        }
        const isStub = readTimeCache[path] === null;
        const card = badge.closest(".index-card");
        if (isStub && card) {
          card.classList.add("index-card--unavailable");
          card.removeAttribute("onclick");
          card.setAttribute("aria-disabled", "true");
          card.title = "Coming soon - this article hasn't been written yet";
          const dot = card.querySelector(".index-card-read-dot");
          if (dot) dot.remove();
          const updatedDot = card.querySelector(".index-card-updated-dot");
          if (updatedDot) updatedDot.remove();
        } else if (card) {
          _applyUpdatedDot(card, path, updatedDateCache[path]);
          _applyFade(card, path);
        }
        badge.textContent = isStub ? "Coming soon" : readTimeCache[path];
      } catch {
        badge.textContent = "";
      }
    }),
  );

  // Section count reflects available (non-stub) articles only, not raw card count
  document.querySelectorAll(".index-section").forEach((sectionEl) => {
    const countEl = sectionEl.querySelector(".section-count");
    if (!countEl) return;
    const cards = sectionEl.querySelectorAll(".index-card");
    const available = sectionEl.querySelectorAll(".index-card:not(.index-card--unavailable)");
    countEl.textContent = available.length;

    if (cards.length > 0 && available.length === 0) {
      sectionEl.classList.add("section--all-stubs");
    }
  });
}

export {
  renderHome,
  getPinnedWikis,
  setPinnedWikis,
  renderIndex,
  renderIndexSections,
  renderIndexControls,
  attachIndexCardKeyNav,
  IndexFilter,
  toggleSection,
  populateIndexReadTimes,
};
