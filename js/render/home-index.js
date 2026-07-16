import { fireStudyMilestone } from "../app/study-feedback.js";
import {
  STUB_THRESHOLD,
  WIKIS,
  escHtml,
  fadeFactorForDaysSinceRead,
  indexCache,
  markStubPath,
  readTimeCache,
  state,
  updatedDateCache,
} from "../state.js";
import { Bookmarks, renderBookmarksSection } from "../storage/bookmarks.js";
import { getLastOpened, isRead, markRead, markUnread } from "../storage/read-tracking.js";
import { renderRecentsSection } from "../storage/recents.js";
import { toggleCollapse } from "../storage/scroll-collapse.js";
import { showHoverPreview } from "./content-view.js";
import {
  dirOf,
  fetchPrebuiltSearchIndex,
  fetchText,
  normalizePath,
  parseUpdatedDate,
  readingTime,
  setBreadcrumb,
} from "./nav-utils.js";
import { showView } from "./router.js";
import { showToast } from "./toast.js";

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
    renderIndexControls(wiki);
    attachIndexCardKeyNav();
    attachIndexCardHoverPreview();
    IndexFilter.apply();

    const savedScroll = localStorage.getItem(`wiki-index-scroll-${wiki.id}`);
    const targetY = savedScroll ? Number.parseInt(savedScroll, 10) : null;

    sectionsEl.classList.add("index-sections--loading");
    const scheduleIdle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1));
    scheduleIdle(() =>
      populateIndexReadTimes().finally(() => {
        sectionsEl.classList.remove("index-sections--loading");
        // Read-time/stub badges can change section height, so only restore scroll
        // once that layout-affecting work is done - restoring earlier (e.g. on
        // fonts.ready) risks the browser clamping targetY to a still-short page.
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
                isRead(card.path) ? "visible" : ""
              }" title="Read"></span>
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

function renderIndexControls(wiki) {
  document.getElementById("index-controls")?.remove();

  const subtitle = document.getElementById("index-subtitle");
  if (!subtitle) return;

  const controls = document.createElement("div");
  controls.id = "index-controls";
  controls.className = "index-controls";

  controls.innerHTML = `
    <button id="index-collapse-all" class="index-ctrl-btn" title="Collapse all sections" aria-label="Collapse all sections">
      <svg class="icon"><use href="#icon-collapse-all"></use></svg>
    </button>
    <button id="index-expand-all" class="index-ctrl-btn" title="Expand all sections" aria-label="Expand all sections">
      <svg class="icon"><use href="#icon-expand-all"></use></svg>
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

let _indexCardHoverTimer;
let _lastPointerWasTouch = false;
window.addEventListener(
  "pointerdown",
  (e) => {
    _lastPointerWasTouch = e.pointerType !== "mouse";
  },
  { capture: true },
);

function attachIndexCardHoverPreview() {
  const container = document.getElementById("index-sections");
  if (!container) return;

  if (container._cardHoverPreview) {
    container.removeEventListener("pointerover", container._cardHoverPreview);
    container.removeEventListener("pointerleave", container._cardHoverLeave);
  }

  let _activeCard = null;

  container._cardHoverPreview = (e) => {
    if (_lastPointerWasTouch) return;
    const card = e.target.closest(".index-card:not(.index-card--unavailable)");
    if (card === _activeCard) return;
    _activeCard = card;
    clearTimeout(_indexCardHoverTimer);
    if (!card) return;
    const path = card.querySelector(".index-card-read-time[data-path]")?.dataset.path;
    if (!path) return;
    _indexCardHoverTimer = setTimeout(() => showHoverPreview(card, path), 400);
  };

  container._cardHoverLeave = (e) => {
    const relTarget = e.relatedTarget;
    if (relTarget && container.contains(relTarget)) return;
    _activeCard = null;
    clearTimeout(_indexCardHoverTimer);
    const previewEl = document.getElementById("hover-preview");
    if (!previewEl) return;
    previewEl.classList.remove("visible");
    previewEl.classList.add("hidden");
    previewEl.textContent = "";
  };

  container.addEventListener("pointerover", container._cardHoverPreview);
  container.addEventListener("pointerleave", container._cardHoverLeave);
}

/* ═══════════════════════════════════════════════════════════════
   INDEX FILTER - live text filter + unread-only toggle
   ═══════════════════════════════════════════════════════════════ */
const IndexFilter = {
  _query: "",
  _readStatus: "all", // "all" | "read" | "unread"
  _pendingUnread: false,
  _debounce: null,

  /* applied on the next index render - lets a command arm it before navigating */
  requestUnread() {
    this._pendingUnread = true;
  },

  reset() {
    this._query = "";
    this._readStatus = this._pendingUnread ? "unread" : "all";
    this._pendingUnread = false;
    const input = document.getElementById("index-filter-input");
    if (input) input.value = "";
    this._syncReadSelect();
  },

  hasActiveFilter() {
    return !!this._query || this._readStatus !== "all";
  },

  // Full clear for the reset-view escape hatch - unlike reset(), this also drops
  // the read-status filter rather than honouring a pending request.
  clearAll() {
    this._query = "";
    this._readStatus = "all";
    this._pendingUnread = false;
    const input = document.getElementById("index-filter-input");
    if (input) input.value = "";
    this._syncReadSelect();
    this.apply();
  },

  _syncReadSelect() {
    const select = document.getElementById("index-filter-read-select");
    if (select) select.value = this._readStatus;
  },

  setQuery(q) {
    this._query = q.trim().toLowerCase();
    this.apply();
  },

  setReadStatus(status) {
    this._readStatus = status;
    this.apply();
  },

  apply() {
    const sections = document.querySelectorAll("#index-sections .index-section");
    sections.forEach((sectionEl) => {
      let visible = 0;
      sectionEl.querySelectorAll(".index-card").forEach((card) => {
        const title = (card.dataset.title || "").toLowerCase();
        const desc = (card.dataset.desc || "").toLowerCase();
        const path = card.querySelector(".index-card-read-time[data-path]")?.dataset.path;
        const matchesText =
          !this._query || title.includes(this._query) || desc.includes(this._query);
        const read = path ? isRead(path) : false;
        const matchesReadStatus =
          this._readStatus === "all" ||
          (this._readStatus === "read" && read) ||
          (this._readStatus === "unread" && !read);
        const show = matchesText && matchesReadStatus;
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
    IndexFilter.setReadStatus(_indexFilterReadSelect.value);
  });
}

/* ─── Index-card swipe: right = bookmark, left = read toggle ─── */
const CARD_SWIPE_THRESHOLD = 50;
const CARD_SWIPE_DEADZONE = 8;
let _cardSwipeBound = false;
let _swipeWiki = null; // current wiki for the delegated index-card swipe

function bindIndexCardSwipe(wiki) {
  _swipeWiki = wiki;
  const container = document.getElementById("index-sections");
  if (!container || _cardSwipeBound) return;
  _cardSwipeBound = true;

  let card = null;
  let sx = 0;
  let sy = 0;
  let axis = null; // null | "x" | "y"

  const pathOf = (c) => c.querySelector(".index-card-read-time[data-path]")?.dataset.path || null;

  const reset = () => {
    if (card) {
      card.style.transition = "transform 180ms ease";
      card.style.transform = "";
      card.classList.remove("card-swiping", "swipe-right", "swipe-left");
      const c = card;
      setTimeout(() => {
        c.style.transition = "";
      }, 200);
    }
    card = null;
    axis = null;
    // Deferred: this touchend is still bubbling up to the document-level edge-swipe
    // listener, which reads this flag to stand down. Clearing it synchronously here
    // would race that read (container's listener fires before document's in bubble
    // order) and re-arm back-nav before the document handler ever sees it was active.
    setTimeout(() => {
      state._cardSwipeActive = false;
    }, 0);
  };

  container.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      const el = e.target.closest(".index-card");
      if (!el || el.classList.contains("index-card--unavailable")) return;
      card = el;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      axis = null;
      card.style.transition = "";
    },
    { passive: true },
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (!card || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      if (!axis) {
        if (Math.abs(dx) < CARD_SWIPE_DEADZONE && Math.abs(dy) < CARD_SWIPE_DEADZONE) return;
        axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
        if (axis === "x") {
          card.classList.add("card-swiping");
          state._cardSwipeActive = true; // tell global edge-swipe (back-nav) to stand down
        } else {
          card = null; // vertical → let the page scroll, abandon swipe
          return;
        }
      }
      if (axis === "x") {
        e.preventDefault(); // claim the horizontal gesture
        card.style.transform = `translateX(${dx}px)`;
        card.classList.toggle("swipe-right", dx > 0);
        card.classList.toggle("swipe-left", dx < 0);
      }
    },
    { passive: false },
  );

  container.addEventListener(
    "touchend",
    (e) => {
      if (!card || axis !== "x") {
        reset();
        return;
      }
      const dx = (e.changedTouches[0]?.clientX ?? sx) - sx;
      const path = pathOf(card);
      if (path && dx > CARD_SWIPE_THRESHOLD) {
        const now = Bookmarks.togglePath(
          _swipeWiki.id,
          path,
          card.querySelector(".index-card-title")?.textContent,
        );
        renderBookmarksSection(_swipeWiki);
        showToast(now ? "Bookmarked" : "Bookmark removed");
      } else if (path && dx < -CARD_SWIPE_THRESHOLD) {
        if (isRead(path)) {
          markUnread(path);
          showToast("Marked unread");
        } else {
          markRead(path);
          showToast("Marked read");
          fireStudyMilestone();
        }
      }
      reset();
    },
    { passive: true },
  );

  container.addEventListener("touchcancel", reset, { passive: true });
}

const PULL_REFRESH_THRESHOLD = 70;
const PULL_REFRESH_MAX = 120;
let _pullRefreshBound = false;
let _pullWiki = null;

function bindIndexPullToRefresh(wiki) {
  _pullWiki = wiki;
  const container = document.getElementById("index-sections");
  if (!container || _pullRefreshBound) return;
  _pullRefreshBound = true;

  let startY = 0;
  let pulling = false;
  let dy = 0;

  container.addEventListener(
    "touchstart",
    (e) => {
      if (container.scrollTop > 0 || e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      pulling = true;
      dy = 0;
    },
    { passive: true },
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (!pulling || e.touches.length !== 1) return;
      dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        container.classList.remove("index-pulling");
        container.style.transform = "";
        return;
      }
      e.preventDefault();
      const clamped = Math.min(dy, PULL_REFRESH_MAX);
      container.classList.add("index-pulling");
      container.style.transform = `translateY(${clamped}px)`;
    },
    { passive: false },
  );

  const endPull = () => {
    if (!pulling) return;
    pulling = false;
    container.classList.remove("index-pulling");
    container.style.transform = "";
    if (dy >= PULL_REFRESH_THRESHOLD) {
      refreshIndex(_pullWiki);
    }
    dy = 0;
  };

  container.addEventListener("touchend", endPull, { passive: true });
  container.addEventListener("touchcancel", endPull, { passive: true });
}

async function refreshIndex(wiki) {
  delete indexCache[wiki.id];
  try {
    sessionStorage.removeItem(`wiki-index-${wiki.id}`);
  } catch {}
  await renderIndex(wiki);
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

// Ambient memory-decay cue - only read articles with a recorded visit fade; unread cards stay at full opacity.
function _applyFade(card, path) {
  const lastOpened = getLastOpened(path);
  if (!isRead(path) || !lastOpened) {
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
          _applyUpdatedDot(card, rawPath, updatedDateCache[path]);
          _applyFade(card, rawPath);
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

/* ─── Shared index cache (used by article counts + global search) ─── */
async function fetchWikiIndex(wiki) {
  if (indexCache[wiki.id]) return indexCache[wiki.id];
  const ssKey = `wiki-index-${wiki.id}`;
  try {
    const hit = sessionStorage.getItem(ssKey);
    if (hit) {
      indexCache[wiki.id] = JSON.parse(hit);
      return indexCache[wiki.id];
    }
  } catch {}

  const prebuilt = await fetchPrebuiltSearchIndex();
  let sections;
  if (prebuilt?.[wiki.id]) {
    sections = prebuilt[wiki.id];
  } else {
    const md = await fetchText(wiki.indexPath);
    const basePath = dirOf(wiki.indexPath);
    sections = parseIndexMd(md, basePath);
  }
  indexCache[wiki.id] = sections;
  try {
    sessionStorage.setItem(ssKey, JSON.stringify(sections));
  } catch {
    // Quota full: evict all other wiki-index-* entries then retry once
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith("wiki-index-") && k !== ssKey) sessionStorage.removeItem(k);
    }
    try {
      sessionStorage.setItem(ssKey, JSON.stringify(sections));
    } catch {}
  }
  return sections;
}

async function updateArticleCounts() {
  for (const wiki of WIKIS) {
    try {
      const sections = await fetchWikiIndex(wiki);
      const count = sections.reduce((sum, s) => sum + s.cards.length, 0);
      const el = document.querySelector(`[data-wiki-id="${wiki.id}"] .wiki-card-count`);
      if (el) el.textContent = `${count} articles`;
    } catch {}
  }
}

/* ─── Index.md Parser ─── */
function parseIndexMd(markdown, basePath) {
  const sections = [];
  const skipHeadings = ["how to use", "contributing"];

  const normalized = markdown.replace(/\r\n/g, "\n");
  const chunks = normalized.split(/\n(?=## )/);

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const firstLine = lines[0];
    if (!firstLine.startsWith("## ")) continue;

    const heading = firstLine.replace(/^## /, "").trim();
    if (skipHeadings.some((s) => heading.toLowerCase().includes(s))) continue;

    const cards = [];

    for (const line of lines) {
      if (!line.startsWith("|")) continue;
      if (/^\|\s*[-:]+/.test(line)) continue; // separator row

      const m = line.match(/^\|\s*\[([^\]]+)\]\(([^)]+\.md)\)\s*\|\s*([^|]+?)\s*\|/);
      if (m) {
        const title = m[1].trim();
        const relPath = m[2].trim();
        const description = m[3].trim();

        const fullPath = `${basePath}/${relPath.replace(/^\.\//, "")}`;
        const slug = relPath.split("/").pop().replace(/\.md$/, "");

        cards.push({ title, path: fullPath, slug, description });
      } else if (line.includes("](")) {
        console.warn("parseIndexMd: malformed row skipped:", line.slice(0, 80));
      }
    }

    if (cards.length) sections.push({ heading, cards });
  }

  return sections;
}

export {
  renderHome,
  getPinnedWikis,
  setPinnedWikis,
  renderIndex,
  renderIndexSections,
  renderIndexControls,
  attachIndexCardKeyNav,
  attachIndexCardHoverPreview,
  IndexFilter,
  bindIndexCardSwipe,
  toggleSection,
  populateIndexReadTimes,
  fetchWikiIndex,
  updateArticleCounts,
  parseIndexMd,
};
