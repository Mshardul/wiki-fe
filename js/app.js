import { Auth, AuthModal } from "./auth.js";
import {
  ArticleFind,
  QuizMode,
  closeZoomOverlay,
  rerenderMermaidDiagrams,
  syncHljsTheme,
  toggleFocusMode,
} from "./content.js";
import {
  navigate,
  navigateToContent,
  progressBar,
  route,
  showToast,
  toggleSection,
} from "./render.js";
import {
  applyGlobalSearch,
  closeGlobalSearch,
  openGlobalSearch,
  removeRecentSearchEntry,
  retryGlobalSearch,
  runSearchCommand,
  saveSearchQuery,
} from "./search.js";
import { WIKIS, escHtml, state } from "./state.js";
import {
  Bookmarks,
  Offline,
  ReadToggle,
  Settings,
  Theme,
  applySettingsToDOM,
  clearRecents,
  getBookmarks,
  getRecents,
  getSettings,
  initOsThemeListener,
  markRead,
  renderBookmarksSection,
  renderRecentsSection,
  saveBookmarks,
  saveRecents,
  saveScrollPos,
  updateReadBtn,
} from "./storage.js";

/* ═══════════════════════════════════════════════════════════════
   WINDOW GLOBALS - required for onclick strings in dynamically
   built innerHTML throughout the app (render.js, storage.js)
   ═══════════════════════════════════════════════════════════════ */
window.state = state;
window.Settings = Settings;
window.Bookmarks = Bookmarks;
window.navigate = navigate;
window.navigateHome = () => navigate("");
window.navigateToContent = navigateToContent;
window.toggleSection = toggleSection;
window.clearRecents = clearRecents;
window.closeGlobalSearch = closeGlobalSearch;
window.retryGlobalSearch = retryGlobalSearch;
window.runSearchCommand = runSearchCommand;
window.saveSearchQuery = saveSearchQuery;
window.removeRecentSearchEntry = removeRecentSearchEntry;
window.applyGlobalSearch = applyGlobalSearch;
window.Auth = Auth;
window.AuthModal = AuthModal;

document.addEventListener("wiki:toast", (e) => {
  const { message, durationMs, onUndo, actionLabel } = e.detail;
  showToast(message, durationMs, onUndo, actionLabel);
});

document.addEventListener("wiki:session-expired", () => {
  Auth.refreshButtons();
  showToast("Session expired, please log in", 5000);
  AuthModal.open("login");
});

document.addEventListener("wiki:session-changed", () => {
  // re-render current view so synced data appears
  route(location.hash.slice(1));
});

window.confirmClearRecents = (wikiId) => {
  const snapshot = getRecents().filter((r) => r.wikiId === wikiId);
  clearRecents(wikiId);
  showToast("Recents cleared", 4000, () => {
    saveRecents([...snapshot, ...getRecents()]);
    const wiki = WIKIS.find((w) => w.id === wikiId);
    if (wiki) renderRecentsSection(wiki);
  });
};

window.confirmClearBookmarks = (wikiId) => {
  const snapshot = getBookmarks().filter((b) => b.wikiId === wikiId);
  Bookmarks.clearWiki(wikiId);
  showToast("Bookmarks cleared", 4000, () => {
    saveBookmarks([...snapshot, ...getBookmarks()]);
    const wiki = WIKIS.find((w) => w.id === wikiId);
    if (wiki) renderBookmarksSection(wiki);
  });
};

/* ═══════════════════════════════════════════════════════════════
   DATA-ACTION DELEGATION
   Handles all static button actions from index.html
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  switch (btn.dataset.action) {
    case "search-open":
      openGlobalSearch();
      break;
    case "settings-open":
      Settings.open();
      break;
    case "settings-close":
    case "prefs-close":
      Settings.close();
      break;
    case "prefs-tab":
      Settings._switchTab(btn.dataset.tab);
      break;
    case "wiki-home":
      navigate("");
      break;
    case "read-toggle":
      ReadToggle.toggle();
      break;
    case "bookmark-toggle":
      Bookmarks.toggle();
      break;
    case "focus-toggle":
      toggleFocusMode();
      break;
    case "offline-toggle":
      Offline.toggle();
      break;
    case "toggle-theme":
      Theme.toggle();
      break;
    case "print-article":
      printArticle();
      break;
    case "copy-source-toggle":
      Settings._toggleCopySourceHeader();
      break;
    case "settings-export":
      Settings.exportData();
      break;
    case "import-trigger":
      document.getElementById("import-upload").click();
      break;
    case "auth-toggle":
      Auth.toggle();
      break;
    case "auth-close":
      AuthModal.close();
      break;
  }
});

document.getElementById("import-upload").addEventListener("change", (e) => Settings.importData(e));

function printArticle() {
  document.getElementById("markdown-body")?.setAttribute("data-print-url", location.href);
  window.print();
}

/* ═══════════════════════════════════════════════════════════════
   TOC COLLAPSE & MOBILE TOC
   ═══════════════════════════════════════════════════════════════ */
document.getElementById("toc-collapse").addEventListener("click", () => {
  document.getElementById("toc-sidebar").classList.toggle("collapsed");
});

const tocMobileBtn = document.getElementById("toc-mobile-btn");
const tocMobileOverlay = document.getElementById("toc-mobile-overlay");
const tocSidebar = document.getElementById("toc-sidebar");

tocMobileBtn.addEventListener("click", () => openMobileToc());
tocMobileOverlay.addEventListener("click", () => closeMobileToc());
document.getElementById("toc-nav").addEventListener("click", (e) => {
  if (e.target.closest(".toc-item")) closeMobileToc();
});

/* ═══════════════════════════════════════════════════════════════
   SCROLL TO TOP
   ═══════════════════════════════════════════════════════════════ */
const scrollTopBtn = document.getElementById("scroll-top");
const _topbars = document.querySelectorAll(".page-topbar, .content-topbar");
let _scrollSaveTimer;
let _indexScrollTimer;

window.addEventListener(
  "scroll",
  () => {
    const scrolled = window.scrollY > 10;
    _topbars.forEach((el) => el.classList.toggle("topbar--scrolled", scrolled));
    scrollTopBtn.classList.toggle("visible", window.scrollY > 300);

    if (state.currentView === "content") {
      const doc = document.documentElement;
      const scrolled = doc.scrollTop || document.body.scrollTop;
      const total = doc.scrollHeight - doc.clientHeight;
      const pct = total > 0 ? scrolled / total : 0;
      progressBar.style.width = `${pct * 100}%`;

      // Auto-mark as read at 85%
      if (pct > 0.85 && state.currentFilePath) {
        markRead(state.currentFilePath);
        updateReadBtn();
      }

      // Persist scroll position (debounced) — capture path now, not at fire time
      clearTimeout(_scrollSaveTimer);
      const _pathAtScroll = state.currentFilePath;
      const _wikiAtScroll = state.currentWikiId;
      _scrollSaveTimer = setTimeout(() => {
        if (_pathAtScroll)
          saveScrollPos(`scroll-${_wikiAtScroll}-${_pathAtScroll}`, window.scrollY);
      }, 400);
    }

    if (state.currentView === "index" && state.currentWikiId) {
      clearTimeout(_indexScrollTimer);
      _indexScrollTimer = setTimeout(() => {
        saveScrollPos(`wiki-index-scroll-${state.currentWikiId}`, window.scrollY);
      }, 300);
    }
  },
  { passive: true },
);

scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

if ("onscrollend" in window) {
  window.addEventListener(
    "scrollend",
    () => {
      if (state.currentView === "content" && state.currentFilePath) {
        clearTimeout(_scrollSaveTimer);
        saveScrollPos(`scroll-${state.currentWikiId}-${state.currentFilePath}`, window.scrollY);
      }
      if (state.currentView === "index" && state.currentWikiId) {
        clearTimeout(_indexScrollTimer);
        saveScrollPos(`wiki-index-scroll-${state.currentWikiId}`, window.scrollY);
      }
    },
    { passive: true },
  );
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE TOUCH GESTURES
   Swipe navigation, panel-close, and a shared close registry.
   All gestures are touch-only and gated to the mobile breakpoint.
   ═══════════════════════════════════════════════════════════════ */
const GESTURE_MOBILE_MAX = 900;
const SWIPE_THRESHOLD = 50;
const EDGE_ZONE = 24;
const DEADZONE = 8;

const isMobileViewport = () => window.innerWidth <= GESTURE_MOBILE_MAX;

// Resolve dominant axis once movement leaves the deadzone; null while ambiguous.
function axisLock(dx, dy) {
  if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return null;
  return Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
}

function isMobileTocOpen() {
  return tocSidebar.classList.contains("mobile-open");
}

function openMobileToc() {
  if (document.getElementById("toc-sidebar").style.display === "none") return;
  if (!document.querySelector("#toc-nav .toc-item")) return;
  tocSidebar.classList.add("mobile-open");
  tocMobileOverlay.classList.add("open");
  document.body.classList.add("toc-open");
}

function closeMobileToc() {
  tocSidebar.classList.remove("mobile-open");
  tocMobileOverlay.classList.remove("open");
  document.body.classList.remove("toc-open");
}

function closeTopPanel() {
  if (document.getElementById("zoom-overlay")?.classList.contains("open")) {
    closeZoomOverlay();
    return true;
  }
  if (Settings.isOpen()) {
    Settings.close();
    return true;
  }
  if (!document.getElementById("global-search-modal").classList.contains("hidden")) {
    closeGlobalSearch();
    return true;
  }
  if (document.getElementById("hover-preview")?.classList.contains("hover-preview--sheet-open")) {
    document.dispatchEvent(new CustomEvent("wiki:close-peek"));
    return true;
  }
  if (isMobileTocOpen()) {
    closeMobileToc();
    return true;
  }
  return false;
}

(function bindSwipeGestures() {
  let sx = 0;
  let sy = 0;
  let axis = null;
  let fromLeftEdge = false;
  let fromRightEdge = false;
  let tracking = false;

  document.addEventListener(
    "touchstart",
    (e) => {
      if (!isMobileViewport() || e.touches.length !== 1) {
        tracking = false;
        return;
      }
      // Lightbox owns its own gestures.
      if (e.target.closest("#zoom-overlay")) {
        tracking = false;
        return;
      }
      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
      axis = null;
      fromLeftEdge = sx <= EDGE_ZONE;
      fromRightEdge = sx >= window.innerWidth - EDGE_ZONE;
      tracking = true;
    },
    { passive: true },
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!tracking || e.touches.length !== 1) return;
      if (!axis) {
        axis = axisLock(e.touches[0].clientX - sx, e.touches[0].clientY - sy);
      }
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;

      if (axis === "x") {
        if (fromLeftEdge && dx > SWIPE_THRESHOLD) {
          // Swipe right from left edge → back.
          if (state.currentView === "content" && state.currentWikiId) {
            navigate(state.currentWikiId);
          }
        } else if (fromRightEdge && dx < -SWIPE_THRESHOLD) {
          // Swipe left from right edge → open TOC drawer (content view only).
          if (state.currentView === "content") openMobileToc();
        }
      } else if (axis === "y") {
        if (dy > SWIPE_THRESHOLD && sy < window.innerHeight / 3) {
          // Swipe down from upper third → close topmost panel/modal.
          closeTopPanel();
        }
      }
    },
    { passive: true },
  );
})();

/* ═══════════════════════════════════════════════════════════════
   ORIENTATION / VIEWPORT RESIZE
   ═══════════════════════════════════════════════════════════════ */
let _resizeTimer = null;
let _lastViewportWidth = window.innerWidth;
window.addEventListener(
  "resize",
  () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      const prevWidth = _lastViewportWidth;
      const width = window.innerWidth;
      _lastViewportWidth = width;

      if (isMobileTocOpen()) closeMobileToc();

      // Hover preview position goes stale on resize/rotation.
      document
        .getElementById("hover-preview")
        ?.classList.remove("visible", "hover-preview--sheet-open");

      // Re-fit Mermaid only when the content view's width actually changed.
      if (state.currentView === "content" && Math.abs(width - prevWidth) > 50) {
        rerenderMermaidDiagrams();
      }
    }, 150);
  },
  { passive: true },
);

/* ═══════════════════════════════════════════════════════════════
   MODAL BACKDROP & GLOBAL KEYDOWN
   ═══════════════════════════════════════════════════════════════ */
document.getElementById("prefs-backdrop").addEventListener("click", () => Settings.close());

document.getElementById("auth-backdrop").addEventListener("click", () => AuthModal.close());

document.getElementById("wiki-switcher-overlay").addEventListener("click", closeWikiSwitcher);

function openWikiSwitcher() {
  const modal = document.getElementById("wiki-switcher-modal");
  const list = document.getElementById("wiki-switcher-list");
  list.innerHTML = WIKIS.map(
    (w) => `
    <button class="wiki-switcher-card${w.id === state.currentWikiId ? " wiki-switcher-card--active" : ""}"
      data-wiki-id="${escHtml(w.id)}" type="button">
      <span class="wiki-switcher-card-icon">${escHtml(w.icon || "📖")}</span>
      <span class="wiki-switcher-card-body">
        <span class="wiki-switcher-card-name">${escHtml(w.name)}</span>
        ${w.description ? `<span class="wiki-switcher-card-desc">${escHtml(w.description)}</span>` : ""}
      </span>
    </button>`,
  ).join("");
  list.querySelectorAll(".wiki-switcher-card").forEach((card) => {
    card.addEventListener("click", () => {
      closeWikiSwitcher();
      navigate(card.dataset.wikiId);
    });
  });
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  const active =
    list.querySelector(".wiki-switcher-card--active") || list.querySelector(".wiki-switcher-card");
  active?.focus();
}

function closeWikiSwitcher() {
  const modal = document.getElementById("wiki-switcher-modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

document.addEventListener("keydown", (e) => {
  // ⌘K: Global Search
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    openGlobalSearch();
  }

  // ⌘F: Search scoped to the current wiki (falls back to browser find on home)
  if ((e.metaKey || e.ctrlKey) && e.key === "f" && state.currentWikiId) {
    e.preventDefault();
    openGlobalSearch({ scope: state.currentWikiId });
  }

  // ?: Open preferences on Keyboard tab (when not focused on input/textarea)
  if (e.key === "?") {
    const tag = document.activeElement.tagName;
    const isInput =
      tag === "INPUT" || tag === "TEXTAREA" || document.activeElement.isContentEditable;
    if (!isInput) {
      e.preventDefault();
      Settings.isOpen() ? Settings.close() : Settings.openTab("keyboard");
    }
  }

  // ,: Open preferences on General tab (global shortcut)
  if (e.key === ",") {
    const tag = document.activeElement.tagName;
    const isInput =
      tag === "INPUT" || tag === "TEXTAREA" || document.activeElement.isContentEditable;
    if (!isInput) {
      e.preventDefault();
      Settings.isOpen() ? Settings.close() : Settings.openTab("general");
    }
  }

  // Escape: Close modals or navigate back from content
  if (e.key === "Escape") {
    if (!document.getElementById("wiki-switcher-modal").classList.contains("hidden")) {
      closeWikiSwitcher();
    } else if (ArticleFind.isOpen()) {
      ArticleFind.close();
    } else if (document.getElementById("zoom-overlay")?.classList.contains("open")) {
      closeZoomOverlay();
    } else if (AuthModal.isOpen()) {
      AuthModal.close();
    } else if (!document.getElementById("global-search-modal").classList.contains("hidden")) {
      closeGlobalSearch();
    } else if (Settings.isOpen()) {
      Settings.close();
    } else if (state.currentView === "content" && state.currentWikiId) {
      navigate(state.currentWikiId);
    }
  }

  // Keyboard shortcuts for content view (when not focused on input/textarea)
  if (state.currentView === "content") {
    const tag = document.activeElement.tagName;
    const isInput =
      tag === "INPUT" || tag === "TEXTAREA" || document.activeElement.isContentEditable;
    if (!isInput) {
      if (e.key === "b" || e.key === "B") {
        Bookmarks.toggle();
        e.preventDefault();
      }
      if (e.key === "/") {
        ArticleFind.open();
        e.preventDefault();
      }
      if (e.key === "f" || e.key === "F") {
        toggleFocusMode();
        e.preventDefault();
      }
      if (e.key === "t" || e.key === "T") {
        const firstItem = document.querySelector("#toc-nav .toc-item");
        if (firstItem) {
          e.preventDefault();
          firstItem.focus();
        }
      }
      if (e.key === "=" || e.key === "+") {
        const sizes = ["S", "M", "L"];
        const cur = getSettings().fontSize;
        const next = sizes[Math.min(sizes.indexOf(cur) + 1, 2)];
        if (next !== cur) {
          Settings._setSize(next);
          e.preventDefault();
        }
      }
      if (e.key === "-") {
        const sizes = ["S", "M", "L"];
        const cur = getSettings().fontSize;
        const next = sizes[Math.max(sizes.indexOf(cur) - 1, 0)];
        if (next !== cur) {
          Settings._setSize(next);
          e.preventDefault();
        }
      }
      if (e.key === "d" || e.key === "D") {
        toggleDistractionFree();
        e.preventDefault();
      }
      if (e.key === "q" || e.key === "Q") {
        QuizMode.toggle();
        e.preventDefault();
      }
    }
  }

  // W: Wiki switcher (content + index views only, not in inputs)
  if (e.key === "w" || e.key === "W") {
    if (state.currentView === "content" || state.currentView === "index") {
      const tag = document.activeElement.tagName;
      const isInput =
        tag === "INPUT" || tag === "TEXTAREA" || document.activeElement.isContentEditable;
      if (!isInput) {
        e.preventDefault();
        openWikiSwitcher();
      }
    }
  }
});

/* ═══════════════════════════════════════════════════════════════
   DISTRACTION-FREE MODE
   ═══════════════════════════════════════════════════════════════ */
let _distractionFree = false;
function toggleDistractionFree() {
  _distractionFree = !_distractionFree;
  document.body.classList.toggle("distraction-free", _distractionFree);
}

/* ═══════════════════════════════════════════════════════════════
   DIAGRAM THEME SYNC
   ═══════════════════════════════════════════════════════════════ */
let _mermaidRerenderTimer = null;
document.addEventListener("wiki:themechange", () => {
  clearTimeout(_mermaidRerenderTimer);
  _mermaidRerenderTimer = setTimeout(rerenderMermaidDiagrams, 150);
  syncHljsTheme();
});

/* ═══════════════════════════════════════════════════════════════
   HASH ROUTER EVENT WIRING
   ═══════════════════════════════════════════════════════════════ */
window.addEventListener("popstate", (e) => {
  const hash = e.state?.hash ?? location.hash.slice(1);
  route(hash);
});

window.addEventListener("hashchange", () => {
  route(location.hash.slice(1));
});

/* ═══════════════════════════════════════════════════════════════
   DEBUG OVERLAY (?debug URL param)
   ═══════════════════════════════════════════════════════════════ */
function mountDebugOverlay() {
  const el = document.createElement("div");
  el.id = "debug-overlay";
  el.className = "debug-overlay";

  const header = document.createElement("div");
  header.className = "debug-header";
  const titleSpan = document.createElement("span");
  titleSpan.className = "debug-title";
  titleSpan.textContent = "Debug";
  const closeBtn = document.createElement("button");
  closeBtn.className = "debug-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => el.remove());
  header.appendChild(titleSpan);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "debug-body";
  el.appendChild(header);
  el.appendChild(body);
  document.body.appendChild(el);

  function refresh() {
    const rows = [
      ["View", state.currentView || "—"],
      ["Wiki", state.currentWikiId || "—"],
      ["File", state.currentFilePath || "—"],
      ["Wikis", String(WIKIS.length)],
      ["SW", "serviceWorker" in navigator ? "supported" : "none"],
      ["Cache API", "caches" in window ? "supported" : "none"],
      ["Clipboard", navigator.clipboard ? "async" : "execCommand"],
      ["Theme", document.documentElement.getAttribute("data-theme") || "dark"],
    ];
    body.innerHTML = rows
      .map(
        ([k, v]) =>
          `<div class="debug-row"><span class="debug-key">${escHtml(
            k,
          )}</span><span class="debug-val">${escHtml(String(v))}</span></div>`,
      )
      .join("");
  }

  refresh();
  document.addEventListener("wiki:themechange", refresh);
  window.addEventListener("hashchange", () => setTimeout(refresh, 100));
}

/* ═══════════════════════════════════════════════════════════════
   INIT - parse hash on load
   ═══════════════════════════════════════════════════════════════ */
(function init() {
  history.scrollRestoration = "manual";
  applySettingsToDOM(getSettings());
  syncHljsTheme();
  initOsThemeListener();

  // async; fires GET /auth/me, pulls data, refreshes UI + re-renders when done.
  // Not awaited — boot/render proceeds anonymously, re-renders on wiki:session-changed.
  Auth.init();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./wiki-sw.js").catch(() => {});
  }

  if (new URLSearchParams(location.search).has("debug")) {
    mountDebugOverlay();
  }

  const hash = location.hash.slice(1);
  route(hash);
})();

// Re-route when restored from BFcache (e.g. history.back() from 404 page)
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    const hash = location.hash.slice(1);
    route(hash);
  }
});
