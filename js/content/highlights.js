import { exportSelectionAsCard } from "./freeze-frame.js";
import { showToast } from "../render/toast.js";
import { Highlights, MARKER_EMOJIS, Markers } from "../storage/highlights.js";
import { state } from "../state.js";

const MARKER_LABELS = {
  "🤔": "confused",
  "💡": "insight",
  "⭐": "key",
  "🔁": "revisit",
  "❓": "question",
  "✅": "got-it",
};

/* ─── Text-node walking: char offsets are relative to #markdown-body's full textContent ─── */
function _textNodes(contentEl) {
  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentNode?.nodeName;
      if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
  return nodes;
}

function _nodeAtOffset(contentEl, offset) {
  let pos = 0;
  for (const node of _textNodes(contentEl)) {
    const len = node.nodeValue.length;
    if (offset <= pos + len) return { node, localOffset: offset - pos };
    pos += len;
  }
  return null;
}

function _rangeFromOffsets(contentEl, start, end) {
  const startHit = _nodeAtOffset(contentEl, start);
  const endHit = _nodeAtOffset(contentEl, end);
  if (!startHit || !endHit) return null;
  const range = document.createRange();
  range.setStart(startHit.node, startHit.localOffset);
  range.setEnd(endHit.node, endHit.localOffset);
  return range;
}

function _globalOffset(contentEl, node, localOffset) {
  let pos = 0;
  for (const n of _textNodes(contentEl)) {
    if (n === node) return pos + localOffset;
    pos += n.nodeValue.length;
  }
  return -1;
}

/* ─── Floating selection toolbar ─── */
let _toolbarEl = null;
let _activeRange = null;

function _getToolbar() {
  if (_toolbarEl) return _toolbarEl;
  const bar = document.createElement("div");
  bar.className = "highlight-toolbar hidden";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Highlight and marker actions");

  const highlightBtn = document.createElement("button");
  highlightBtn.type = "button";
  highlightBtn.className = "highlight-toolbar-btn highlight-toolbar-btn--highlight";
  highlightBtn.setAttribute("aria-label", "Highlight selected text");
  highlightBtn.title = "Highlight";
  highlightBtn.textContent = "✎";
  highlightBtn.addEventListener("click", () => {
    if (_activeRange) _createHighlight(_activeRange);
    _hideToolbar();
  });
  bar.appendChild(highlightBtn);

  const divider = document.createElement("span");
  divider.className = "highlight-toolbar-divider";
  divider.setAttribute("aria-hidden", "true");
  bar.appendChild(divider);

  MARKER_EMOJIS.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "highlight-toolbar-btn highlight-toolbar-btn--emoji";
    btn.setAttribute("aria-label", `Add ${MARKER_LABELS[emoji]} marker`);
    btn.title = MARKER_LABELS[emoji];
    btn.textContent = emoji;
    btn.addEventListener("click", () => {
      if (_activeRange) _createMarker(_activeRange, emoji);
      _hideToolbar();
    });
    bar.appendChild(btn);
  });

  const cardDivider = document.createElement("span");
  cardDivider.className = "highlight-toolbar-divider";
  cardDivider.setAttribute("aria-hidden", "true");
  bar.appendChild(cardDivider);

  const cardBtn = document.createElement("button");
  cardBtn.type = "button";
  cardBtn.className = "highlight-toolbar-btn highlight-toolbar-btn--card";
  cardBtn.setAttribute("aria-label", "Save selection as image card");
  cardBtn.title = "Save as card";
  cardBtn.textContent = "🖼";
  cardBtn.addEventListener("click", () => {
    // Independent one-shot export - leaves the selection and toolbar untouched
    if (_activeRange) exportSelectionAsCard(_activeRange.toString());
  });
  bar.appendChild(cardBtn);

  document.body.appendChild(bar);
  _toolbarEl = bar;
  return bar;
}

function _positionToolbar(bar, rect) {
  const TOOLBAR_GAP = 8;
  const top = window.scrollY + rect.top - TOOLBAR_GAP;
  const left = window.scrollX + rect.left + rect.width / 2;
  bar.style.top = `${Math.max(window.scrollY + 4, top)}px`;
  bar.style.left = `${left}px`;
}

function _showToolbar(range) {
  _activeRange = range.cloneRange();
  const bar = _getToolbar();
  const rect = range.getBoundingClientRect();
  bar.classList.remove("hidden");
  _positionToolbar(bar, rect);
}

function _hideToolbar() {
  if (_toolbarEl) _toolbarEl.classList.add("hidden");
  _activeRange = null;
}

/* ─── Remove popover (click an existing highlight/marker) ─── */
let _removePopoverEl = null;

function _getRemovePopover() {
  if (_removePopoverEl) return _removePopoverEl;
  const pop = document.createElement("div");
  pop.className = "highlight-remove-popover hidden";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", "Remove highlight or marker");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "highlight-remove-btn";
  btn.textContent = "Remove";
  btn.setAttribute("aria-label", "Remove");
  pop.appendChild(btn);
  document.body.appendChild(pop);
  _removePopoverEl = pop;
  return pop;
}

function _hideRemovePopover() {
  if (_removePopoverEl) _removePopoverEl.classList.add("hidden");
}

function _showRemovePopover(targetEl, onRemove) {
  const pop = _getRemovePopover();
  const btn = pop.querySelector(".highlight-remove-btn");
  btn.onclick = () => {
    onRemove();
    _hideRemovePopover();
  };
  const rect = targetEl.getBoundingClientRect();
  pop.style.top = `${window.scrollY + rect.bottom + 6}px`;
  pop.style.left = `${window.scrollX + rect.left}px`;
  pop.classList.remove("hidden");
}

/* ─── Highlight creation / application ─── */
function _wrapRangeInMark(range, id) {
  const mark = document.createElement("span");
  mark.className = "wiki-highlight";
  mark.dataset.highlightId = id;
  mark.tabIndex = 0;
  mark.setAttribute("role", "mark");
  mark.setAttribute("aria-label", "Highlighted text - activate to remove");
  try {
    range.surroundContents(mark);
    return mark;
  } catch {
    // Range spans multiple elements (surroundContents needs a single-parent range) - extract+wrap instead.
    const frag = range.extractContents();
    mark.appendChild(frag);
    range.insertNode(mark);
    return mark;
  }
}

function _createHighlight(range) {
  const contentEl = document.getElementById("markdown-body");
  if (!contentEl || range.collapsed) return;

  const start = _globalOffset(contentEl, range.startContainer, range.startOffset);
  const end = _globalOffset(contentEl, range.endContainer, range.endOffset);
  if (start < 0 || end < 0 || end <= start) return;

  const snippet = range.toString().slice(0, 80);
  const entry = Highlights.add(state.currentWikiId, state.currentFilePath, {
    start,
    end,
    snippet,
  });

  const liveRange = _rangeFromOffsets(contentEl, start, end);
  if (liveRange) _wrapRangeInMark(liveRange, entry.id);
  window.getSelection()?.removeAllRanges();
}

function _createMarker(range, emoji) {
  const contentEl = document.getElementById("markdown-body");
  if (!contentEl) return;

  const offset = _globalOffset(contentEl, range.startContainer, range.startOffset);
  if (offset < 0) return;

  const snippet = range.toString().slice(0, 40);
  const entry = Markers.add(state.currentWikiId, state.currentFilePath, {
    offset,
    emoji,
    snippet,
  });

  const hit = _nodeAtOffset(contentEl, offset);
  if (hit) _insertMarkerBadge(hit.node, hit.localOffset, entry);
  window.getSelection()?.removeAllRanges();
}

function _insertMarkerBadge(node, localOffset, entry) {
  const badge = document.createElement("span");
  badge.className = "wiki-marker";
  badge.dataset.markerId = entry.id;
  badge.tabIndex = 0;
  badge.setAttribute("role", "button");
  badge.setAttribute(
    "aria-label",
    `${MARKER_LABELS[entry.emoji] || "marker"} note - activate to remove`,
  );
  badge.textContent = entry.emoji;

  if (localOffset <= 0) {
    node.parentNode.insertBefore(badge, node);
  } else if (localOffset >= node.nodeValue.length) {
    node.parentNode.insertBefore(badge, node.nextSibling);
  } else {
    const after = node.splitText(localOffset);
    node.parentNode.insertBefore(badge, after);
  }
}

/* ─── Stale-offset detection + re-anchoring ───
   Markdown edits upstream of a stored offset shift every downstream index. Before
   trusting a stored offset, verify the article's current textContent still has the
   stored snippet at that position; if not, search a bounded window around it and
   re-anchor there. If the snippet isn't found nearby either, the entry is dropped
   rather than silently misplaced. */
const REANCHOR_SEARCH_WINDOW = 2000;

function _snippetMatchesAt(fullText, offset, snippet) {
  return snippet && fullText.slice(offset, offset + snippet.length) === snippet;
}

// Returns the offset where `snippet` was found near `offset`, or -1 if not found nearby.
function _findNearbyOffset(fullText, offset, snippet) {
  if (!snippet) return -1;
  const from = Math.max(0, offset - REANCHOR_SEARCH_WINDOW);
  const to = Math.min(fullText.length, offset + REANCHOR_SEARCH_WINDOW);
  const window = fullText.slice(from, to);
  const localIdx = window.indexOf(snippet);
  return localIdx === -1 ? -1 : from + localIdx;
}

/* ─── Re-apply persisted highlights + markers on article load ─── */
function applyHighlightsAndMarkers(contentEl, wikiId, articlePath) {
  const fullText = contentEl.textContent;
  let dropped = 0;

  const highlights = Highlights.getAll(wikiId, articlePath);
  // Sort by start offset so earlier wraps don't shift later offsets mid-loop
  highlights
    .slice()
    .sort((a, b) => a.start - b.start)
    .forEach((h) => {
      let { start, end } = h;
      if (!_snippetMatchesAt(fullText, start, h.snippet)) {
        const found = _findNearbyOffset(fullText, start, h.snippet);
        if (found === -1) {
          Highlights.remove(wikiId, articlePath, h.id);
          dropped++;
          return;
        }
        start = found;
        end = found + h.snippet.length;
      }
      const range = _rangeFromOffsets(contentEl, start, end);
      if (range && !range.collapsed) _wrapRangeInMark(range, h.id);
    });

  const markers = Markers.getAll(wikiId, articlePath);
  markers
    .slice()
    .sort((a, b) => a.offset - b.offset)
    .forEach((m) => {
      let offset = m.offset;
      if (!_snippetMatchesAt(fullText, offset, m.snippet)) {
        const found = _findNearbyOffset(fullText, offset, m.snippet);
        if (found === -1) {
          Markers.remove(wikiId, articlePath, m.id);
          dropped++;
          return;
        }
        offset = found;
      }
      const hit = _nodeAtOffset(contentEl, offset);
      if (hit) _insertMarkerBadge(hit.node, hit.localOffset, m);
    });

  if (dropped > 0) {
    showToast(
      `${dropped} highlight${dropped > 1 ? "s" : ""}/marker${dropped > 1 ? "s" : ""} couldn't be relocated after edits and were removed`,
    );
  }
}

// #markdown-body persists across renders, so binding is delegated to document/window once per page load, not once per article
let _wired = false;

function _removeHighlight(mark) {
  Highlights.remove(state.currentWikiId, state.currentFilePath, mark.dataset.highlightId);
  const parent = mark.parentNode;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  parent.removeChild(mark);
  parent.normalize();
}

function _removeMarker(marker) {
  Markers.remove(state.currentWikiId, state.currentFilePath, marker.dataset.markerId);
  marker.remove();
}

function wireHighlights() {
  if (_wired) return;
  _wired = true;

  document.addEventListener("mouseup", (e) => {
    const contentEl = document.getElementById("markdown-body");
    if (!contentEl || !contentEl.contains(e.target)) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!contentEl.contains(range.commonAncestorContainer)) return;
    if (!range.toString().trim()) return;
    _showToolbar(range);
  });

  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) _hideToolbar();
  });

  document.addEventListener("click", (e) => {
    const mark = e.target.closest(".wiki-highlight");
    if (mark) {
      e.stopPropagation();
      _showRemovePopover(mark, () => _removeHighlight(mark));
      return;
    }
    const marker = e.target.closest(".wiki-marker");
    if (marker) {
      e.stopPropagation();
      _showRemovePopover(marker, () => _removeMarker(marker));
      return;
    }
    if (_removePopoverEl && !e.target.closest(".highlight-remove-popover")) {
      _hideRemovePopover();
    }
    const contentEl = document.getElementById("markdown-body");
    if (_toolbarEl && !e.target.closest(".highlight-toolbar") && !contentEl?.contains(e.target)) {
      _hideToolbar();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const mark = e.target.closest(".wiki-highlight, .wiki-marker");
    if (!mark) return;
    e.preventDefault();
    mark.click();
  });

  window.addEventListener(
    "scroll",
    () => {
      _hideToolbar();
      _hideRemovePopover();
    },
    { passive: true },
  );
}

export { applyHighlightsAndMarkers, wireHighlights };
