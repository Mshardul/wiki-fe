import { rerenderMermaidDiagrams } from "../content/mermaid.js";
import { closeZoomOverlay } from "../content/zoom-lightbox.js";
import { navigate } from "../render/router.js";
import { closeGlobalSearch } from "../search.js";
import { state } from "../state.js";
import { Settings } from "../storage/settings-theme.js";

const tocMobileBtn = document.getElementById("toc-mobile-btn");
const tocMobileOverlay = document.getElementById("toc-mobile-overlay");
const tocSidebar = document.getElementById("toc-sidebar");

document.getElementById("toc-collapse").addEventListener("click", () => {
  document.getElementById("toc-sidebar").classList.toggle("collapsed");
});

tocMobileBtn.addEventListener("click", () => openMobileToc());
tocMobileOverlay.addEventListener("click", () => closeMobileToc());
document.getElementById("toc-nav").addEventListener("click", (e) => {
  if (e.target.closest(".toc-item")) closeMobileToc();
});

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

/* ═══════════════════════════════════════════════════════════════
   MOBILE TOUCH GESTURES
   Swipe navigation, panel-close, and a shared close registry.
   All gestures are touch-only and gated to the mobile breakpoint.
   ═══════════════════════════════════════════════════════════════ */
const GESTURE_MOBILE_MAX = 900;
const SWIPE_THRESHOLD = 50;
const EDGE_ZONE = 44;
const DEADZONE = 8;

const isMobileViewport = () => window.innerWidth <= GESTURE_MOBILE_MAX;

// Resolve dominant axis once movement leaves the deadzone; null while ambiguous.
function axisLock(dx, dy) {
  if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return null;
  return Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
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
        const panelOpen =
          Settings.isOpen() ||
          document.getElementById("hover-preview")?.classList.contains("hover-preview--sheet-open");
        if (dy > SWIPE_THRESHOLD && (panelOpen || sy < window.innerHeight / 3)) {
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
    // Snapshot search-modal state at resize-start, not at debounce-fire — a modal
    // opened during the debounce window (e.g. ⌘K right after a resize) must not
    // be closed by a resize that predates it.
    const searchWasOpenAtResizeStart = !document
      .getElementById("global-search-modal")
      .classList.contains("hidden");
    _resizeTimer = setTimeout(() => {
      const prevWidth = _lastViewportWidth;
      const width = window.innerWidth;
      _lastViewportWidth = width;
      const widthChangedSignificantly = Math.abs(width - prevWidth) > 50;

      if (isMobileTocOpen()) closeMobileToc();

      if (widthChangedSignificantly && searchWasOpenAtResizeStart) {
        closeGlobalSearch();
      }

      // Hover preview position goes stale on resize/rotation.
      document
        .getElementById("hover-preview")
        ?.classList.remove("visible", "hover-preview--sheet-open");

      // Re-fit Mermaid only when the content view's width actually changed.
      if (state.currentView === "content" && widthChangedSignificantly) {
        rerenderMermaidDiagrams();
      }
    }, 150);
  },
  { passive: true },
);

export { isMobileTocOpen, openMobileToc, closeMobileToc, closeTopPanel };
