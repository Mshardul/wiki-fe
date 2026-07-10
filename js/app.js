import { Auth, AuthModal } from "./auth.js";
import "./app/home-parallax.js";
import "./app/mobile-panels.js";
import { mountDebugOverlay } from "./app/debug-overlay.js";
import {
  exitDistractionFree,
  isDistractionFree,
  toggleDistractionFree,
} from "./app/distraction-free.js";
import { printArticle } from "./app/print.js";
import { closeWikiSwitcher, openWikiSwitcher } from "./app/wiki-switcher.js";
import { syncHljsTheme, writeToClipboard } from "./content/code-blocks.js";
import {
  ArticleFind,
  cleanupFocusMode,
  cleanupStudyMode,
  isFocusMode,
  isStudyMode,
  toggleFocusMode,
  toggleStudyMode,
} from "./content/formatting.js";
import { rerenderMermaidDiagrams } from "./content/mermaid.js";
import { QuizMode } from "./content/tables.js";
import { expandAllSections, initProgressRingScrollTop, updateProgressRing } from "./content/toc.js";
import { closeZoomOverlay } from "./content/zoom-lightbox.js";
import { getCurrentMarkdown, navigateToContent } from "./render/content-view.js";
import { IndexFilter, toggleSection } from "./render/home-index.js";
import { navigate, progressBar, route } from "./render/router.js";
import { showToast } from "./render/toast.js";
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
  getBookmarks,
  renderBookmarksSection,
  saveBookmarks,
} from "./storage/bookmarks.js";
import { Offline } from "./storage/offline.js";
import { ReadToggle, markRead, updateReadBtn } from "./storage/read-tracking.js";
import { clearRecents, getRecents, renderRecentsSection, saveRecents } from "./storage/recents.js";
import { saveScrollPos } from "./storage/scroll-collapse.js";
import {
  Settings,
  applySettingsToDOM,
  getSettings,
  initOsThemeListener,
} from "./storage/settings-theme.js";

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
    case "prefs-search-open":
      Settings.close();
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
    case "quiz-toggle":
      QuizMode.toggle();
      break;
    case "distraction-free-exit":
      toggleDistractionFree();
      break;
    case "print-article":
      printArticle();
      break;
    case "copy-markdown": {
      const markdown = getCurrentMarkdown();
      if (!markdown) break;
      writeToClipboard(markdown)
        .then(() => showToast("Markdown copied"))
        .catch(() => showToast("Copy failed - clipboard access denied"));
      break;
    }
    case "find-open":
      ArticleFind.open();
      break;
    case "overflow-toggle":
      toggleTopbarOverflow();
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
  if (btn.dataset.action !== "overflow-toggle" && btn.closest("#content-overflow-menu")) {
    closeTopbarOverflow();
  }
});

document.getElementById("import-upload").addEventListener("change", (e) => Settings.importData(e));

/* ═══════════════════════════════════════════════════════════════
   TOPBAR OVERFLOW MENU (mobile)
   ═══════════════════════════════════════════════════════════════ */
function toggleTopbarOverflow() {
  const menu = document.getElementById("content-overflow-menu");
  const btn = document.getElementById("content-overflow-btn");
  const isOpen = menu.classList.toggle("open");
  btn.setAttribute("aria-expanded", String(isOpen));
}
function closeTopbarOverflow() {
  const menu = document.getElementById("content-overflow-menu");
  const btn = document.getElementById("content-overflow-btn");
  menu.classList.remove("open");
  btn.setAttribute("aria-expanded", "false");
}

/* ═══════════════════════════════════════════════════════════════
   RESET-VIEW ESCAPE HATCH (WIKI-278)
   Escape resets an active reading mode / filter in place, confirmed,
   instead of navigating away. Falls through to the normal Escape
   chain (navigate back, etc.) when nothing is active to reset.
   ═══════════════════════════════════════════════════════════════ */
function hasResettableViewState() {
  if (isFocusMode() || isStudyMode() || isDistractionFree()) return true;
  if (state.currentView === "content") {
    return !!document.querySelector("#markdown-body h2.section--collapsed");
  }
  if (state.currentView === "index") {
    return IndexFilter.hasActiveFilter();
  }
  return false;
}

function resetView() {
  if (!window.confirm("Reset view to default? This clears filters and exits any reading modes.")) {
    return;
  }
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  cleanupFocusMode();
  cleanupStudyMode();
  exitDistractionFree();
  ArticleFind.close();
  document.getElementById("resume-chip")?.remove();

  if (state.currentView === "content") {
    const body = document.getElementById("markdown-body");
    if (body) expandAllSections(body);
  } else if (state.currentView === "index") {
    IndexFilter.clearAll();
  }

  window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
  showToast("View reset");
}
document.addEventListener("click", (e) => {
  const menu = document.getElementById("content-overflow-menu");
  if (!menu.classList.contains("open")) return;
  if (e.target.closest(".topbar-overflow")) return;
  closeTopbarOverflow();
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
      updateProgressRing(pct);

      // Auto-mark as read at 85%
      if (pct > 0.85 && state.currentFilePath) {
        markRead(state.currentFilePath);
        updateReadBtn();
      }

      // Persist scroll position (debounced) - capture path now, not at fire time
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
      const _wikiAtIndexScroll = state.currentWikiId;
      const _yAtIndexScroll = window.scrollY;
      _indexScrollTimer = setTimeout(() => {
        if (state.currentView !== "index" || state.currentWikiId !== _wikiAtIndexScroll) return;
        saveScrollPos(`wiki-index-scroll-${_wikiAtIndexScroll}`, _yAtIndexScroll);
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
   MODAL BACKDROP & GLOBAL KEYDOWN
   ═══════════════════════════════════════════════════════════════ */
document.getElementById("prefs-backdrop").addEventListener("click", () => Settings.close());

document.getElementById("auth-backdrop").addEventListener("click", () => AuthModal.close());

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
    if (document.getElementById("content-overflow-menu").classList.contains("open")) {
      closeTopbarOverflow();
    } else if (!document.getElementById("wiki-switcher-modal").classList.contains("hidden")) {
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
    } else if (hasResettableViewState()) {
      // A reading mode is active or the view is filtered - Escape resets it
      // in place rather than navigating away (WIKI-278).
      resetView();
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
      if (e.key === "h" || e.key === "H") {
        toggleStudyMode();
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
   INIT - parse hash on load
   ═══════════════════════════════════════════════════════════════ */
(function init() {
  history.scrollRestoration = "manual";
  applySettingsToDOM(getSettings());
  syncHljsTheme();
  initOsThemeListener();

  // async; fires GET /auth/me, pulls data, refreshes UI + re-renders when done.
  // Not awaited - boot/render proceeds anonymously, re-renders on wiki:session-changed.
  Auth.init();
  Auth.handleBootParams();
  initProgressRingScrollTop();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./wiki-sw.js")
      .then((reg) => {
        const promptUpdate = (worker) => {
          showToast(
            "A new version is available.",
            8000,
            () => {
              worker.postMessage("SKIP_WAITING");
            },
            "Refresh",
          );
        };

        if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              promptUpdate(newWorker);
            }
          });
        });
      })
      .catch(() => {});

    let _swRefreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (_swRefreshing) return;
      _swRefreshing = true;
      location.reload();
    });
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

    // route() renders async (content fetch + double rAF) - the browser's own
    // post-bfcache scroll adjustment can land after that and override it, so
    // reassert the saved position once the route has had time to settle.
    const wikiId = state.currentWikiId;
    const filePath = state.currentFilePath;
    if (filePath) {
      setTimeout(() => {
        if (state.currentView !== "content" || state.currentFilePath !== filePath) return;
        const saved = localStorage.getItem(`scroll-${wikiId}-${filePath}`);
        if (saved) window.scrollTo({ top: Number.parseInt(saved, 10), behavior: "instant" });
      }, 60);
    }
  }
});
