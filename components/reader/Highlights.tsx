"use client";

import { useEffect } from "react";
import {
  findNearbyOffset,
  globalOffset,
  nodeAtOffset,
  rangeFromOffsets,
  snippetMatchesAt,
} from "@/lib/reader/text-offsets";
import {
  type Highlight,
  Highlights,
  MARKER_EMOJIS,
  MARKER_LABELS,
  type Marker,
  Markers,
} from "@/lib/storage/highlights";
import { showToast } from "@/lib/toast";

interface HighlightsProps {
  wikiId: string;
  articlePath: string;
}

function selectionInCode(range: Range): boolean {
  const node = range.commonAncestorContainer;
  const el = (
    node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  ) as HTMLElement | null;
  return !!el?.closest("pre, code");
}

function wrapRangeInMark(range: Range, id: string): HTMLElement {
  const mark = document.createElement("span");
  mark.className = "wiki-highlight";
  mark.dataset.highlightId = id;
  mark.tabIndex = 0;
  mark.setAttribute("role", "mark");
  mark.setAttribute("aria-label", "Highlighted text - activate to remove");
  try {
    range.surroundContents(mark);
  } catch {
    // Range spans multiple elements (surroundContents needs a single-parent range) - extract+wrap instead.
    const frag = range.extractContents();
    mark.appendChild(frag);
    range.insertNode(mark);
  }
  return mark;
}

function insertMarkerBadge(node: Text, localOffset: number, entry: Marker): void {
  // Skip stored markers whose offset now lands inside a code block.
  if (node.parentElement?.closest("pre, code")) return;

  const badge = document.createElement("span");
  badge.className = "wiki-marker";
  badge.dataset.markerId = entry.id;
  badge.dataset.emoji = entry.emoji;
  badge.tabIndex = 0;
  badge.setAttribute("role", "button");
  const label = MARKER_LABELS[entry.emoji] || "marker";
  badge.setAttribute("aria-label", `${label} note - activate to remove`);
  badge.title = label;
  // textContent keeps emoji for a11y/persist; CSS collapses glyph layout.
  badge.textContent = entry.emoji;

  const len = node.nodeValue?.length ?? 0;
  if (localOffset <= 0) {
    node.parentNode?.insertBefore(badge, node);
  } else if (localOffset >= len) {
    node.parentNode?.insertBefore(badge, node.nextSibling);
  } else {
    const after = node.splitText(localOffset);
    node.parentNode?.insertBefore(badge, after);
  }
}

export function HighlightsIsland({ wikiId, articlePath }: HighlightsProps) {
  useEffect(() => {
    const contentEl =
      document.getElementById("markdown-body") ??
      document.querySelector<HTMLElement>(".markdown-body");
    if (!contentEl) return;

    /* RE-APPLY PERSISTED HIGHLIGHTS + MARKERS ON LOAD */
    const fullText = contentEl.textContent ?? "";
    let dropped = 0;

    const highlights = Highlights.getAll(wikiId, articlePath);
    // Sort by start offset so earlier wraps don't shift later offsets mid-loop.
    for (const h of [...highlights].sort((a, b) => a.start - b.start)) {
      let { start, end } = h;
      if (!snippetMatchesAt(fullText, start, h.snippet)) {
        const found = findNearbyOffset(fullText, start, h.snippet);
        if (found === -1) {
          Highlights.remove(wikiId, articlePath, h.id);
          dropped++;
          continue;
        }
        start = found;
        end = found + h.snippet.length;
      }
      const range = rangeFromOffsets(contentEl, start, end);
      if (range && !range.collapsed) wrapRangeInMark(range, h.id);
    }

    const markers = Markers.getAll(wikiId, articlePath);
    // Descending offset: each badge insert shifts later offsets in the live DOM.
    for (const m of [...markers].sort((a, b) => b.offset - a.offset)) {
      let offset = m.offset;
      if (!snippetMatchesAt(fullText, offset, m.snippet)) {
        const found = findNearbyOffset(fullText, offset, m.snippet);
        if (found === -1) {
          Markers.remove(wikiId, articlePath, m.id);
          dropped++;
          continue;
        }
        offset = found;
      }
      const hit = nodeAtOffset(contentEl, offset);
      if (hit) insertMarkerBadge(hit.node, hit.localOffset, m);
    }

    if (dropped > 0) {
      showToast(
        `${dropped} highlight${dropped > 1 ? "s" : ""}/marker${dropped > 1 ? "s" : ""} couldn't be relocated after edits and were removed`,
      );
    }

    /* FLOATING SELECTION TOOLBAR */
    const bar = document.createElement("div");
    bar.className = "highlight-toolbar hidden";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Highlight and marker actions");

    let activeRange: Range | null = null;

    const hideToolbar = () => {
      bar.classList.add("hidden");
      activeRange = null;
    };

    const highlightBtn = document.createElement("button");
    highlightBtn.type = "button";
    highlightBtn.className = "highlight-toolbar-btn highlight-toolbar-btn--highlight";
    highlightBtn.setAttribute("aria-label", "Highlight selected text");
    highlightBtn.title = "Highlight";
    highlightBtn.textContent = "✎";
    // mousedown preventDefault keeps the article selection alive through the click
    // (otherwise selectionchange clears activeRange before the click handler runs).
    highlightBtn.addEventListener("mousedown", (e) => e.preventDefault());
    highlightBtn.addEventListener("click", () => {
      if (activeRange) createHighlight(activeRange);
      hideToolbar();
    });
    bar.appendChild(highlightBtn);

    const divider = document.createElement("span");
    divider.className = "highlight-toolbar-divider";
    divider.setAttribute("aria-hidden", "true");
    bar.appendChild(divider);

    for (const emoji of MARKER_EMOJIS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "highlight-toolbar-btn highlight-toolbar-btn--emoji";
      const label = MARKER_LABELS[emoji] ?? "marker";
      btn.setAttribute("aria-label", `Add ${label} marker`);
      btn.title = label;
      btn.textContent = emoji;
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", () => {
        if (activeRange) createMarker(activeRange, emoji);
        hideToolbar();
      });
      bar.appendChild(btn);
    }

    document.body.appendChild(bar);

    function positionToolbar(rect: DOMRect): void {
      const TOOLBAR_GAP = 8;
      const top = window.scrollY + rect.top - TOOLBAR_GAP;
      const left = window.scrollX + rect.left + rect.width / 2;
      bar.style.top = `${Math.max(window.scrollY + 4, top)}px`;
      bar.style.left = `${left}px`;
    }

    function showToolbar(range: Range): void {
      activeRange = range.cloneRange();
      const inCode = selectionInCode(range);
      for (const btn of bar.querySelectorAll<HTMLElement>(".highlight-toolbar-btn--emoji")) {
        btn.hidden = inCode;
      }
      const emojiDivider = bar.querySelector<HTMLElement>(".highlight-toolbar-divider");
      if (emojiDivider) emojiDivider.hidden = inCode;
      positionToolbar(range.getBoundingClientRect());
      bar.classList.remove("hidden");
    }

    /* REMOVE POPOVER (click an existing highlight/marker) */
    const popover = document.createElement("div");
    popover.className = "highlight-remove-popover hidden";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", "Remove highlight or marker");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "highlight-remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.setAttribute("aria-label", "Remove");
    popover.appendChild(removeBtn);
    document.body.appendChild(popover);

    const hideRemovePopover = () => popover.classList.add("hidden");

    function showRemovePopover(targetEl: HTMLElement, onRemove: () => void): void {
      removeBtn.onclick = () => {
        onRemove();
        hideRemovePopover();
      };
      const rect = targetEl.getBoundingClientRect();
      popover.style.top = `${window.scrollY + rect.bottom + 6}px`;
      popover.style.left = `${window.scrollX + rect.left}px`;
      popover.classList.remove("hidden");
    }

    /* CREATION */
    function createHighlight(range: Range): void {
      if (range.collapsed) return;
      const start = globalOffset(contentEl as HTMLElement, range.startContainer, range.startOffset);
      const end = globalOffset(contentEl as HTMLElement, range.endContainer, range.endOffset);
      if (start < 0 || end < 0 || end <= start) return;

      const snippet = range.toString().slice(0, 80);
      const entry: Highlight = Highlights.add(wikiId, articlePath, { start, end, snippet });

      const liveRange = rangeFromOffsets(contentEl as HTMLElement, start, end);
      if (liveRange) wrapRangeInMark(liveRange, entry.id);
      window.getSelection()?.removeAllRanges();
    }

    function createMarker(range: Range, emoji: string): void {
      // Markers splice into the text stream - never inside code.
      if (selectionInCode(range)) return;

      const offset = globalOffset(
        contentEl as HTMLElement,
        range.startContainer,
        range.startOffset,
      );
      if (offset < 0) return;

      const snippet = range.toString().slice(0, 40);
      const entry: Marker = Markers.add(wikiId, articlePath, { offset, emoji, snippet });

      const hit = nodeAtOffset(contentEl as HTMLElement, offset);
      if (hit) insertMarkerBadge(hit.node, hit.localOffset, entry);
      window.getSelection()?.removeAllRanges();
    }

    function removeHighlight(mark: HTMLElement): void {
      Highlights.remove(wikiId, articlePath, mark.dataset.highlightId ?? "");
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }

    function removeMarker(marker: HTMLElement): void {
      Markers.remove(wikiId, articlePath, marker.dataset.markerId ?? "");
      marker.remove();
    }

    /* EVENT WIRING */
    const onMouseUp = (e: MouseEvent) => {
      if (!contentEl.contains(e.target as Node)) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!contentEl.contains(range.commonAncestorContainer)) return;
      if (!range.toString().trim()) return;
      showToolbar(range);
    };
    document.addEventListener("mouseup", onMouseUp);

    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) hideToolbar();
    };
    document.addEventListener("selectionchange", onSelectionChange);

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const mark = target.closest<HTMLElement>(".wiki-highlight");
      if (mark) {
        e.stopPropagation();
        showRemovePopover(mark, () => removeHighlight(mark));
        return;
      }
      const marker = target.closest<HTMLElement>(".wiki-marker");
      if (marker) {
        e.stopPropagation();
        showRemovePopover(marker, () => removeMarker(marker));
        return;
      }
      if (!popover.classList.contains("hidden") && !target.closest(".highlight-remove-popover")) {
        hideRemovePopover();
      }
      if (
        !bar.classList.contains("hidden") &&
        !target.closest(".highlight-toolbar") &&
        !contentEl.contains(target)
      ) {
        hideToolbar();
      }
    };
    document.addEventListener("click", onClick);

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const mark = (e.target as HTMLElement).closest<HTMLElement>(".wiki-highlight, .wiki-marker");
      if (!mark) return;
      e.preventDefault();
      mark.click();
    };
    document.addEventListener("keydown", onKeydown);

    const onScroll = () => {
      hideToolbar();
      hideRemovePopover();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("scroll", onScroll);
      bar.remove();
      popover.remove();
    };
  }, [wikiId, articlePath]);

  return null;
}
