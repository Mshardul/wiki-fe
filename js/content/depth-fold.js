/* ═══════════════════════════════════════════════════════════════
   DEPTH-N CONTENT FOLDING
   Wraps content between headings into fold-region containers keyed by
   heading depth, then a single control (data-depth on #markdown-body)
   shows/hides regions at or below that depth. Distinct from the
   per-heading collapse toggle in toc.js: that's a manual, per-section
   open/close the reader drives one heading at a time; this is one
   global dial that redraws the whole article's fold state at once.
   The two don't share region-wrapping logic because they wrap at
   different granularities (h2-only vs h2/h3/h4) and serve different
   DOM lifecycles - trying to unify them would couple an ephemeral
   per-visit read mode to a persisted per-section preference.
   ═══════════════════════════════════════════════════════════════ */
const FOLD_DEPTH_KEY = "wiki-fold-depth";
const MIN_DEPTH = 1;
const MAX_DEPTH = 3;
const DEFAULT_DEPTH = MAX_DEPTH;

const HEADING_TO_LEVEL = { H2: 1, H3: 2, H4: 3 };

/* Wraps the run of siblings following each h2/h3/h4 (up to the next
   heading of equal-or-higher rank) into a .fold-region tagged with the
   depth level that heading belongs to. Idempotent - safe to call once
   per render since content is rebuilt from scratch each time. */
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

/* Sets the fold depth on #markdown-body and persists it session-wide
   (one global preference, not per-article - see ticket remarks). */
function setFoldDepth(depth, contentEl = document.getElementById("markdown-body")) {
  const clamped = Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, depth));
  sessionStorage.setItem(FOLD_DEPTH_KEY, String(clamped));
  if (contentEl) contentEl.dataset.depth = String(clamped);
  _syncFoldControl(clamped);
  return clamped;
}

export { applyContentFold, setFoldDepth, getFoldDepth, MIN_DEPTH, MAX_DEPTH };
