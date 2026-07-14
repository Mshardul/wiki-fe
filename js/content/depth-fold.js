/* ═══════════════════════════════════════════════════════════════
   DEPTH-N CONTENT FOLDING
   One global dial (data-depth on #markdown-body) that shows/hides
   fold-region containers by heading depth. Distinct from toc.js's
   per-heading collapse (manual, per-section) - the two don't share
   region-wrapping logic because they wrap at different granularities
   (h2-only vs h2/h3/h4) and serve different DOM lifecycles.
   ═══════════════════════════════════════════════════════════════ */
const FOLD_DEPTH_KEY = "wiki-fold-depth";
const MIN_DEPTH = 1;
const MAX_DEPTH = 3;
const DEFAULT_DEPTH = MAX_DEPTH;

const HEADING_TO_LEVEL = { H2: 1, H3: 2, H4: 3 };

// Idempotent - safe to call once per render since content is rebuilt from scratch each time
function applyContentFold(contentEl) {
  const headings = Array.from(contentEl.querySelectorAll("h2, h3, h4"));

  headings.forEach((h) => {
    const level = HEADING_TO_LEVEL[h.tagName];
    h.dataset.foldLevel = String(level);

    const region = document.createElement("div");
    region.className = "fold-region";
    region.dataset.foldLevel = String(level);

    let next = h.nextElementSibling;
    const toMove = [];
    while (next && !/^H[1-4]$/.test(next.tagName)) {
      toMove.push(next);
      next = next.nextElementSibling;
    }
    if (!toMove.length) return;

    h.insertAdjacentElement("afterend", region);
    toMove.forEach((el) => region.appendChild(el));
  });
}

function getFoldDepth() {
  const raw = Number.parseInt(sessionStorage.getItem(FOLD_DEPTH_KEY), 10);
  if (Number.isNaN(raw) || raw < MIN_DEPTH || raw > MAX_DEPTH) return DEFAULT_DEPTH;
  return raw;
}

function _syncFoldControl(depth) {
  document.querySelectorAll("[data-depth-fold]").forEach((btn) => {
    const btnDepth = Number.parseInt(btn.dataset.depthFold, 10);
    btn.classList.toggle("active", btnDepth === depth);
    btn.setAttribute("aria-pressed", String(btnDepth === depth));
  });
}

// Persisted session-wide - one global preference, not per-article
function setFoldDepth(depth, contentEl = document.getElementById("markdown-body")) {
  const clamped = Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, depth));
  sessionStorage.setItem(FOLD_DEPTH_KEY, String(clamped));
  if (contentEl) contentEl.dataset.depth = String(clamped);
  _syncFoldControl(clamped);
  return clamped;
}

export { applyContentFold, setFoldDepth, getFoldDepth, MIN_DEPTH, MAX_DEPTH };
