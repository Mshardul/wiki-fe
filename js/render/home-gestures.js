import { allSearchCache, indexCache, state } from "../state.js";
import { Bookmarks, renderBookmarksSection } from "../storage/bookmarks.js";
import { renderIndex } from "./home-index.js";
import { buildSearchEntriesForWiki } from "./home-parse.js";
import { normalizePath } from "./nav-utils.js";
import { showToast } from "./toast.js";

/* INDEX-CARD SWIPE (right = bookmark) */
const CARD_SWIPE_THRESHOLD = 50;
const CARD_SWIPE_DEADZONE = 8;
let _cardSwipeBound = false;
let _swipeWiki = null;

function bindIndexCardSwipe(wiki) {
  _swipeWiki = wiki;
  const container = document.getElementById("index-sections");
  if (!container || _cardSwipeBound) return;
  _cardSwipeBound = true;

  let card = null;
  let sx = 0;
  let sy = 0;
  let axis = null; // null | "x" | "y"

  const pathOf = (c) => {
    const raw = c.querySelector(".index-card-read-time[data-path]")?.dataset.path;
    return raw ? normalizePath(raw) : null;
  };

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
    // Deferred to a macrotask: clearing synchronously would race the document-level edge-swipe listener still reading this flag during the same bubble phase.
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
  await _refreshSearchCacheForWiki(wiki);
  await renderIndex(wiki);
}

// refreshIndex() only busts this view's indexCache; search.js's own ⌘K cache never revisits, so stale wiki rows there must be purged here too.
async function _refreshSearchCacheForWiki(wiki) {
  if (!allSearchCache.loaded) return; // never populated yet - nothing stale to fix
  allSearchCache.entries = allSearchCache.entries.filter((e) => e.wiki.id !== wiki.id);
  try {
    allSearchCache.entries.push(...(await buildSearchEntriesForWiki(wiki)));
  } catch {}
}

export { bindIndexCardSwipe, bindIndexPullToRefresh };
