/* Content rendering pipeline: fetch -> parse -> post-process -> wire links/preview.
   Kept as a single file - splitting further would only fragment one linear flow. */
import {
  addCodeBlockHeader,
  addCodeLangLabels,
  addCollapsibleCodeBlocks,
  addCopyButtons,
  addLineNumbers,
  addPreOverflowDetection,
} from "../content/code-blocks.js";
import {
  ArticleFind,
  addAnchorLinks,
  addArticleEndMarker,
  addCollapsibleCallouts,
  addFootnotes,
  addFormulaToggle,
  addLatexCopyButtons,
  addTabbedCodeBlocks,
  cleanupFocusMode,
  renderPrerequisites,
  styleCallouts,
} from "../content/formatting.js";
import {
  addGlossaryTerms,
  addInlineCaveats,
  addInlineGlossaryExpand,
  cacheRenderedHtml,
  getCachedHtml,
  resetGlossaryExpandTracking,
} from "../content/glossary-caveats.js";
import {
  addMermaidNodeCaptions,
  addMermaidStepThrough,
  renderMermaidDiagrams,
} from "../content/mermaid.js";
import { renderStructureViz } from "../content/structure-viz.js";
import { QuizMode, addQuizTables, addTableScrollCues, addTableSort } from "../content/tables.js";
import {
  addStickySection,
  buildTOC,
  cleanupStickySection,
  injectHeadingCollapseToggles,
} from "../content/toc.js";
import { addDiagramZoom, addImageLightbox } from "../content/zoom-lightbox.js";
import {
  WIKIS,
  escHtml,
  getShapeFingerprint,
  markStubPath,
  mdConverter,
  readTimeCache,
  saveShapeFingerprint,
  state,
} from "../state.js";
import { updateBookmarkBtn } from "../storage/bookmarks.js";
import { renderNotesScratchpad } from "../storage/notes.js";
import { updateOfflineBtn } from "../storage/offline.js";
import { updateReadBtn } from "../storage/read-tracking.js";
import { addToRecents } from "../storage/recents.js";
import {
  dirOf,
  fetchText,
  normalizePath,
  readingTime,
  resolvePath,
  setBreadcrumb,
  updatePageTitle,
} from "./nav-utils.js";
import { extractRecommendedLinks, renderRelatedArticles } from "./related-articles.js";
import { showView } from "./router.js";
import { showToast } from "./toast.js";

/* ─── Loading skeleton ─── */
function buildLoadingSkeleton(fingerprint) {
  const line = (w) => `<div class="skeleton-line" style="width:${w}"></div>`;
  const para = () =>
    `<div class="skeleton-para">${line("100%")}${line("96%")}${line("88%")}${line("60%")}</div>`;

  if (!fingerprint) {
    return `<div class="skeleton" aria-hidden="true">
      <div class="skeleton-heading skeleton-heading--h1"></div>
      ${para()}${para()}
    </div>`;
  }

  const headings = Math.min(Math.max(fingerprint.headings || 0, 0), 12);
  const codeBlocks = Math.min(Math.max(fingerprint.codeBlocks || 0, 0), 8);

  let blocks = "";
  for (let i = 0; i < headings; i++) {
    blocks += `<div class="skeleton-heading"></div>${para()}`;
    if (codeBlocks > 0 && i % 2 === 1) {
      blocks += `<div class="skeleton-code"></div>`;
    }
  }
  // Any code blocks not interleaved above, appended at the end.
  const placed = Math.floor(headings / 2);
  for (let i = placed; i < codeBlocks; i++) {
    blocks += `<div class="skeleton-code"></div>`;
  }
  if (!blocks) blocks = `${para()}${para()}`;

  return `<div class="skeleton" aria-hidden="true">
    <div class="skeleton-heading skeleton-heading--h1"></div>
    ${blocks}
  </div>`;
}

/* ─── Inline SVG diagrams ─── */
async function inlineSvgImages(contentEl) {
  const imgs = [...contentEl.querySelectorAll('img[src$=".svg"]')];
  if (!imgs.length || typeof DOMPurify === "undefined") return;

  await Promise.all(
    imgs.map(async (img) => {
      try {
        const res = await fetch(new URL(img.src, location.href).href);
        if (!res.ok) return;
        const raw = await res.text();
        const clean = DOMPurify.sanitize(raw, {
          USE_PROFILES: { svg: true, svgFilters: true },
        });
        const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg || doc.querySelector("parsererror")) return;
        svg.classList.add("inline-svg");
        if (img.alt && !svg.getAttribute("aria-label")) {
          svg.setAttribute("role", "img");
          svg.setAttribute("aria-label", img.alt);
        }
        img.replaceWith(svg);
      } catch {
        /* leave the <img> in place on any failure */
      }
    }),
  );
}

let _renderGen = 0;

function navigateToContent(wikiId, encodedPath, encodedTitle, slug) {
  const filePath = decodeURIComponent(encodedPath);
  const title = decodeURIComponent(encodedTitle);
  const wiki = WIKIS.find((w) => w.id === wikiId);
  renderContent(wiki, filePath, title, true, slug);
}

async function renderContent(wiki, rawPath, title, pushNav = true, slug = null) {
  const filePath = normalizePath(rawPath);
  const gen = ++_renderGen;

  state.currentWikiId = wiki.id;
  state.currentFilePath = filePath;
  state.currentTitle = title;

  updatePageTitle(title);

  const derivedSlug = slug || filePath.split("/").pop().replace(/\.md$/, "");

  if (pushNav) {
    const url = `${location.pathname}#${wiki.id}/${derivedSlug}`;
    history.pushState({ hash: `${wiki.id}/${derivedSlug}`, filePath, title }, "", url);
  }

  // Breadcrumb
  setBreadcrumb("content-breadcrumb", [
    { label: "Home", href: "#" },
    { label: wiki.title, href: `#${wiki.id}` },
    { label: title },
  ]);

  // Back button → return to index
  const backBtn = document.getElementById("content-back-btn");
  backBtn.onclick = () => window.navigate(wiki.id);

  showView("view-content");

  const heroGhost = document.getElementById("article-hero-ghost");
  if (heroGhost) heroGhost.textContent = title;

  const body = document.getElementById("markdown-body");
  delete body.dataset.renderDone;
  body.innerHTML = buildLoadingSkeleton(getShapeFingerprint(filePath));

  // Clear old observers and modes
  if (state.tocObserver) {
    state.tocObserver.disconnect();
    state.tocObserver = null;
  }
  const tocSidebar = document.getElementById("toc-sidebar");
  if (tocSidebar?._tocScrollHandler) {
    tocSidebar.removeEventListener("scroll", tocSidebar._tocScrollHandler);
    tocSidebar._tocScrollHandler = null;
  }
  state.tableResizeObservers.forEach((ro) => ro.disconnect());
  state.tableResizeObservers = [];
  state.preResizeObservers.forEach((ro) => ro.disconnect());
  state.preResizeObservers = [];
  cleanupFocusMode();
  cleanupStickySection();
  ArticleFind.close();
  document.body.classList.remove("distraction-free");
  document.getElementById("toc-nav").innerHTML = "";

  const readTimeBadge = document.getElementById("content-read-time");
  if (readTimeBadge) readTimeBadge.textContent = "";

  try {
    const markdown = await fetchText(filePath);
    if (gen !== _renderGen) return;

    // Only track successful loads.
    addToRecents({ wikiId: wiki.id, path: filePath, title, slug: derivedSlug });

    // Set reading time immediately after fetch
    if (readTimeBadge) {
      readTimeBadge.textContent = readTimeCache[filePath] || readingTime(markdown);
      readTimeCache[filePath] = readTimeBadge.textContent;
    }

    const bodyContent = markdown
      .trim()
      .replace(/^#{1,6}\s+[^\n]*\n?/, "")
      .trim();
    if (!bodyContent) {
      body.innerHTML = `
        <div class="content-stub">
          <div class="content-stub-icon">✦</div>
          <h2 class="content-stub-title">${escHtml(title)}</h2>
          <p class="content-stub-msg">This article hasn't been written yet.</p>
        </div>`;
      if (readTimeBadge) readTimeBadge.textContent = "";
      markStubPath(filePath);
      buildTOC(body, wiki.id, filePath);
      body.dataset.renderDone = "1";
      return;
    }

    // DOMPurify (XSS Protection)
    let rawHtml = getCachedHtml(filePath);
    if (!rawHtml) {
      rawHtml = mdConverter.makeHtml(markdown);
      cacheRenderedHtml(filePath, rawHtml);
    }
    body.innerHTML = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml;

    // KaTeX rendering
    if (typeof renderMathInElement !== "undefined") {
      renderMathInElement(body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    }

    // Mermaid must run before hljs so it claims those blocks first
    await renderMermaidDiagrams(body);
    renderStructureViz(body);

    // Syntax highlighting
    if (typeof hljs !== "undefined") {
      body.querySelectorAll("pre code").forEach((block) => {
        if (block.className.match(/language-(\w+)/)) block.dataset.langExplicit = "true";
        hljs.highlightElement(block);
      });
    }

    // Post-processing - enhancements only.
    try {
      const recommendedLinks = extractRecommendedLinks(body, filePath);

      addTabbedCodeBlocks(body);
      addLineNumbers(body);
      addCodeBlockHeader(body, () => showToast("Copy failed - clipboard access denied"));
      styleCallouts(body);
      addCollapsibleCallouts(body);

      // Quiz-me mode
      addQuizTables(body);
      QuizMode.reset();
      QuizMode.bind(body);

      // Prerequisites Chips
      renderPrerequisites(body);

      interceptMdLinks(body, wiki, filePath);
      addAnchorLinks(
        body,
        () => showToast("Copy failed - clipboard access denied"),
        () => showToast("Link copied"),
      );

      // Accent first word of h1 with gradient
      const h1El = body.querySelector("h1");
      if (h1El && h1El.childNodes.length > 0) {
        const firstNode = h1El.childNodes[0];
        if (firstNode.nodeType === Node.TEXT_NODE) {
          const text = firstNode.textContent;
          const spaceIdx = text.indexOf(" ");
          if (spaceIdx > 0) {
            const accentSpan = document.createElement("span");
            accentSpan.className = "h1-accent";
            accentSpan.textContent = text.slice(0, spaceIdx);
            firstNode.replaceWith(accentSpan, document.createTextNode(text.slice(spaceIdx)));
          }
        }
      }

      injectHeadingCollapseToggles(body, wiki.id, filePath);
      buildTOC(body, wiki.id, filePath);
      renderNotesScratchpad(wiki.id, filePath);
      addStickySection(body);

      addCodeLangLabels(body);
      addCollapsibleCodeBlocks(body);

      await inlineSvgImages(body);

      body
        .querySelectorAll("img:not([loading])")
        .forEach((img) => img.setAttribute("loading", "lazy"));

      addImageLightbox(body);
      addGlossaryTerms(body);
      resetGlossaryExpandTracking();
      addInlineGlossaryExpand(body);
      addInlineCaveats(body);
      addMermaidNodeCaptions(body);
      addDiagramZoom(body); // MUST run after addMermaidNodeCaptions to keep the copy button
      addMermaidStepThrough(body); // MUST run after addDiagramZoom - same reason, keeps Play button
      addTableScrollCues(body);
      addPreOverflowDetection(body);
      addTableSort(body);
      addLatexCopyButtons(body, () => showToast("Copy failed - clipboard access denied"));
      addFormulaToggle(body);
      addFootnotes(body);
      addArticleEndMarker(body);

      renderRelatedArticles(wiki, filePath, recommendedLinks);

      updateBookmarkBtn();
      updateReadBtn();
      updateOfflineBtn();
    } catch {
      showToast("Some content enhancements failed to load");
    }

    saveShapeFingerprint(filePath, {
      headings: body.querySelectorAll("h2, h3").length,
      codeBlocks: body.querySelectorAll("pre").length,
    });

    if (state.titleObserver) {
      state.titleObserver.disconnect();
      state.titleObserver = null;
    }
    const topbarTitle = document.getElementById("topbar-title");
    if (topbarTitle) {
      topbarTitle.textContent = title;
      topbarTitle.title = title;
      topbarTitle.classList.remove("visible");
      const h1 = body.querySelector("h1");
      if (h1) {
        state.titleObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            topbarTitle.classList.toggle(
              "visible",
              !entry.isIntersecting && entry.boundingClientRect.top < 0,
            );
          },
          { rootMargin: "-44px 0px 0px 0px" },
        );
        state.titleObserver.observe(h1);
      }
    }

    const anchor = new URLSearchParams(location.search).get("a");
    if (anchor) {
      const target = body.querySelector(`[id="${CSS.escape(anchor)}"]`);
      if (target)
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            target.scrollIntoView({ behavior: "smooth", block: "start" }),
          ),
        );
    }

    if (!anchor) {
      const _saved = localStorage.getItem(`scroll-${wiki.id}-${filePath}`);
      if (_saved) {
        const _targetY = Number.parseInt(_saved, 10);
        document.fonts.ready.then(() =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (gen !== _renderGen || state.currentView !== "content") return;
              window.scrollTo({ top: _targetY, behavior: "instant" });
            }),
          ),
        );
      }
    }

    body.dataset.renderDone = "1";
  } catch (err) {
    body.innerHTML = `<p class="error">Failed to load content. (${escHtml(err.message)})</p>`;
    body.dataset.renderDone = "1";
  }
}

/* ─── Internal .md link interception & Hover Previews ─── */
let hoverPreviewTimer;
let _previewAbortController = null;
let _previewGeneration = 0;

// Whether the most recent pointer interaction came from touch (vs mouse).
let _lastPointerWasTouch = false;
window.addEventListener(
  "pointerdown",
  (e) => {
    _lastPointerWasTouch = e.pointerType !== "mouse";
  },
  { capture: true },
);

function interceptMdLinks(contentEl, wiki, currentFilePath) {
  const baseDir = dirOf(currentFilePath);
  const previewEl = document.getElementById("hover-preview");

  contentEl.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    // Anchor links
    if (href.startsWith("#")) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = href.slice(1);

        // CSS.escape handles IDs with special characters
        const target = document.querySelector(`[id="${CSS.escape(targetId)}"]`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });

          // Update the URL with the deep-link query param without breaking the hash route
          const url = new URL(location.href);
          url.searchParams.set("a", targetId);
          history.replaceState(history.state, "", url.toString());
        }
      });
      return;
    }

    // External links navigate away in new tab
    if (href.startsWith("http")) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
      return;
    }

    // Ignore missing or non-md links (strip fragment before checking extension)
    if (!href.split("#")[0].endsWith(".md")) return;

    // Handle internal markdown links (strip fragment for fetch/storage)
    const resolvedPath = resolvePath(baseDir, href).split("#")[0];

    link.addEventListener("click", (e) => {
      e.preventDefault();
      const title = link.textContent.trim();
      renderContent(wiki, resolvedPath, title);
      if (previewEl) {
        previewEl.classList.remove("visible");
        previewEl.classList.add("hidden");
      }
    });

    // Hover logic - skip on touch
    link.addEventListener("mouseenter", () => {
      if (_lastPointerWasTouch) return;
      hoverPreviewTimer = setTimeout(() => showHoverPreview(link, resolvedPath), 400);
    });

    link.addEventListener("mouseleave", () => {
      clearTimeout(hoverPreviewTimer);
      if (_previewAbortController) {
        _previewAbortController.abort();
        _previewAbortController = null;
      }
      _previewGeneration++;
      if (previewEl) {
        previewEl.classList.remove("visible");
        previewEl.classList.add("hidden");
        previewEl.textContent = "";
      }
    });

    // Touch long-press → bottom-sheet peek (mobile parity for hover preview).
    let _lpTimer = null;
    let _lpX = 0;
    let _lpY = 0;
    const cancelLongPress = () => {
      clearTimeout(_lpTimer);
      _lpTimer = null;
    };
    link.addEventListener(
      "touchstart",
      (e) => {
        if (!_lastPointerWasTouch || e.touches.length !== 1) return;
        _lpX = e.touches[0].clientX;
        _lpY = e.touches[0].clientY;
        _lpTimer = setTimeout(() => {
          _peekSuppressClick = true;
          showHoverPreview(link, resolvedPath, { asSheet: true });
        }, LONGPRESS_MS);
      },
      { passive: true },
    );
    link.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches[0];
        if (
          !t ||
          Math.abs(t.clientX - _lpX) > LONGPRESS_MOVE_CANCEL ||
          Math.abs(t.clientY - _lpY) > LONGPRESS_MOVE_CANCEL
        ) {
          cancelLongPress();
        }
      },
      { passive: true },
    );
    link.addEventListener("touchend", cancelLongPress, { passive: true });
    link.addEventListener("touchcancel", cancelLongPress, { passive: true });

    // Suppress synthetic click that follows a long-press so peek doesn't navigate.
    link.addEventListener("click", (e) => {
      if (_peekSuppressClick) {
        e.preventDefault();
        e.stopImmediatePropagation();
        _peekSuppressClick = false;
      }
    });
  });
}

/* ─── Long-press peek state + dismissal ─── */
const LONGPRESS_MS = 450;
const LONGPRESS_MOVE_CANCEL = 10;
let _peekSuppressClick = false;

function closePeekSheet() {
  const previewEl = document.getElementById("hover-preview");
  if (!previewEl) return;
  if (_previewAbortController) {
    _previewAbortController.abort();
    _previewAbortController = null;
  }
  _previewGeneration++;
  previewEl.classList.remove("visible", "hover-preview--sheet-open");
  previewEl.classList.add("hidden");
  previewEl.textContent = "";
}

// Swipe-down close (app.js panel registry) routes here.
document.addEventListener("wiki:close-peek", closePeekSheet);

// Tap outside an open sheet dismisses it.
document.addEventListener(
  "touchstart",
  (e) => {
    const previewEl = document.getElementById("hover-preview");
    if (!previewEl?.classList.contains("hover-preview--sheet-open")) return;
    if (!e.target.closest("#hover-preview")) closePeekSheet();
  },
  { passive: true },
);

async function showHoverPreview(link, path, { asSheet = false } = {}) {
  const previewEl = document.getElementById("hover-preview");

  // Cancel any in-flight fetch from a previous hover
  if (_previewAbortController) _previewAbortController.abort();
  _previewAbortController = new AbortController();
  const { signal } = _previewAbortController;
  const gen = ++_previewGeneration;

  if (asSheet) {
    // Mobile bottom sheet: CSS handles placement; clear desktop anchoring.
    previewEl.classList.add("hover-preview--sheet", "hover-preview--sheet-open");
    previewEl.style.top = "";
    previewEl.style.left = "";
  } else {
    previewEl.classList.remove("hover-preview--sheet", "hover-preview--sheet-open");
    // Position preview - prefer below, flip above when near viewport bottom
    const rect = link.getBoundingClientRect();
    const PREVIEW_H = 160;
    const spaceBelow = window.innerHeight - rect.bottom;
    const topPos =
      spaceBelow >= PREVIEW_H + 8
        ? window.scrollY + rect.bottom + 8
        : window.scrollY + rect.top - PREVIEW_H - 8;
    previewEl.style.top = `${Math.max(window.scrollY + 8, topPos)}px`;

    let leftPos = rect.left;
    if (leftPos + 340 > window.innerWidth) leftPos = window.innerWidth - 360;
    previewEl.style.left = `${Math.max(8, leftPos)}px`;
  }

  previewEl.innerHTML = '<div class="loading">Loading preview...</div>';
  previewEl.classList.remove("hidden");
  previewEl.classList.add("visible");

  const SKIP_PREFIXES = ["prerequisites:", "prerequisites", "prerequisite", "table of contents"];

  try {
    const md = await fetchText(path, signal);
    if (gen !== _previewGeneration) return;
    if (!previewEl.classList.contains("visible")) return;
    let extract = "";

    // Search whole doc for TLDR section
    const tldrMatch = md.match(/##\s*TL;?DR\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
    if (tldrMatch?.[1].trim()) {
      extract = tldrMatch[1].trim();
    } else {
      // Fallback: first substantive paragraph that isn't prereqs/TOC/heading
      const withoutTitle = md.replace(/^#[^#][^\n]*\n/, "");
      const paras = withoutTitle.split("\n\n");
      extract =
        paras
          .find((p) => {
            const t = p.trim().toLowerCase();
            return (
              t.length > 20 && !t.startsWith("#") && !SKIP_PREFIXES.some((s) => t.startsWith(s))
            );
          })
          ?.trim() || "";
    }

    if (!extract) throw new Error("Empty");
    if (extract.length > 350) extract = `${extract.slice(0, 350)}...`;

    const rawHtml = mdConverter.makeHtml(extract);
    previewEl.innerHTML = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml;

    if (typeof renderMathInElement !== "undefined") {
      renderMathInElement(previewEl, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    }
  } catch (err) {
    if (err.name === "AbortError") return;
    previewEl.innerHTML = '<p style="color:var(--text-muted)">Preview not available.</p>';
  }
}

export { navigateToContent, renderContent, interceptMdLinks, closePeekSheet, showHoverPreview };
