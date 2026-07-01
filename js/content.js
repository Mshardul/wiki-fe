import { WIKIS, state } from "./state.js";
import {
  getCollapsed,
  getSettings,
  recordReveal,
  restoreTOCScroll,
  saveTOCScroll,
  toggleCollapse,
} from "./storage.js";

/* ─── Zoom Overlay (shared by image lightbox + diagram zoom) ─── */
function getZoomOverlay() {
  let overlay = document.getElementById("zoom-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "zoom-overlay";
    overlay.className = "zoom-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Zoomed view");
    overlay.innerHTML = `
      <div class="zoom-overlay-backdrop"></div>
      <button class="zoom-overlay-close" aria-label="Close">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="zoom-overlay-content"></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".zoom-overlay-backdrop").addEventListener("click", closeZoomOverlay);
    overlay.querySelector(".zoom-overlay-close").addEventListener("click", closeZoomOverlay);

    bindZoomGestures(overlay);
  }
  return overlay;
}

/* ─── Lightbox touch gestures: pinch-zoom, zoomed-pan, swipe-down dismiss ─── */
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

function bindZoomGestures(overlay) {
  const target = () => overlay.querySelector(".zoom-overlay-content")?.firstElementChild;

  let scale = 1;
  let tx = 0;
  let ty = 0;

  // pinch state
  let startDist = 0;
  let startScale = 1;
  // single-finger state
  let startX = 0;
  let startY = 0;
  let startTx = 0;
  let startTy = 0;
  let panning = false;
  // double-tap
  let lastTap = 0;

  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function apply() {
    const el = target();
    if (el) el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function clampPan() {
    const el = target();
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxX = Math.max(0, (r.width - window.innerWidth) / 2 + 40);
    const maxY = Math.max(0, (r.height - window.innerHeight) / 2 + 40);
    tx = clamp(tx, -maxX, maxX);
    ty = clamp(ty, -maxY, maxY);
  }

  function reset() {
    scale = 1;
    tx = 0;
    ty = 0;
    apply();
  }

  overlay.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 2) {
        startDist = dist(e.touches);
        startScale = scale;
      } else if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTx = tx;
        startTy = ty;
        panning = scale > 1;
      }
    },
    { passive: true },
  );

  overlay.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        if (startDist > 0) {
          scale = clamp(startScale * (dist(e.touches) / startDist), ZOOM_MIN, ZOOM_MAX);
          if (scale <= 1) {
            tx = 0;
            ty = 0;
          }
          apply();
        }
      } else if (e.touches.length === 1 && panning && scale > 1) {
        e.preventDefault();
        tx = startTx + (e.touches[0].clientX - startX);
        ty = startTy + (e.touches[0].clientY - startY);
        clampPan();
        apply();
      }
    },
    { passive: false },
  );

  overlay.addEventListener(
    "touchend",
    (e) => {
      if (scale <= 1.02 && scale !== 1) reset();

      if (e.changedTouches.length === 1 && !panning) {
        const now = Date.now();
        if (now - lastTap < 300) {
          if (scale > 1) {
            reset();
          } else {
            scale = 2;
            const t = e.changedTouches[0];
            tx = (window.innerWidth / 2 - t.clientX) * (scale - 1);
            ty = (window.innerHeight / 2 - t.clientY) * (scale - 1);
            clampPan();
            apply();
          }
          lastTap = 0;
          return;
        }
        lastTap = now;
      }

      if (scale <= 1 && e.changedTouches.length === 1) {
        const dy = e.changedTouches[0].clientY - startY;
        const dx = e.changedTouches[0].clientX - startX;
        if (dy > 80 && Math.abs(dx) < dy) closeZoomOverlay();
      }
      panning = false;
    },
    { passive: true },
  );

  overlay._resetZoom = reset;
}

function closeZoomOverlay() {
  const overlay = document.getElementById("zoom-overlay");
  overlay?.classList.remove("open");
  overlay?._resetZoom?.();
}

function openZoomOverlay(node, caption = "") {
  const overlay = getZoomOverlay();
  const contentEl = overlay.querySelector(".zoom-overlay-content");
  contentEl.innerHTML = "";
  contentEl.appendChild(node);
  overlay._resetZoom?.();

  let cap = overlay.querySelector(".zoom-caption");
  if (caption) {
    if (!cap) {
      cap = document.createElement("p");
      cap.className = "zoom-caption";
      overlay.appendChild(cap);
    }
    cap.textContent = caption;
    cap.hidden = false;
  } else if (cap) {
    cap.hidden = true;
  }

  overlay.classList.add("open");
}

/* ─── Clipboard helper with execCommand fallback for HTTP contexts ─── */
function writeToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("style", "position:fixed;top:-9999px;left:-9999px;opacity:0");
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

/* Languages that use # for line comments; everything else gets // */
const HASH_COMMENT_LANGS = new Set([
  "python",
  "py",
  "ruby",
  "rb",
  "bash",
  "sh",
  "shell",
  "yaml",
  "yml",
  "r",
  "perl",
]);

function buildSourceHeader(lang) {
  if (!getSettings().copySourceHeader) return "";
  const title = state.currentTitle;
  if (!title) return "";
  const wiki = WIKIS.find((w) => w.id === state.currentWikiId);
  const origin = wiki ? `${title} · ${wiki.title} wiki` : `${title} · wiki`;
  const prefix = HASH_COMMENT_LANGS.has((lang || "").toLowerCase()) ? "#" : "//";
  return `${prefix} from: ${origin}\n`;
}

/* ─── Code Block Header (traffic lights + lang label + copy button) ─── */
function addCodeBlockHeader(contentEl, onCopyError = () => {}) {
  contentEl.querySelectorAll("pre").forEach((pre) => {
    const code = pre.querySelector("code");
    const header = document.createElement("div");
    header.className = "code-header";

    // Traffic lights
    const lights = document.createElement("div");
    lights.className = "code-traffic-lights";
    lights.setAttribute("aria-hidden", "true");
    ["tl-red", "tl-yellow", "tl-green"].forEach((cls) => {
      const dot = document.createElement("span");
      dot.className = `tl ${cls}`;
      lights.appendChild(dot);
    });
    header.appendChild(lights);

    // Lang label (centered in header)
    const langMatch = code?.className.match(/language-(\w+)/);
    if (langMatch && langMatch[1] !== "mermaid") {
      const label = document.createElement("span");
      label.className = "code-lang-label";
      label.textContent = langMatch[1];
      header.appendChild(label);
      pre.classList.add("has-lang-label");
    }

    pre.insertBefore(header, pre.firstChild);

    // Copy button — floats inside code body, hidden until hover
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.title = "Copy code";
    btn.setAttribute("aria-label", "Copy code");
    btn.textContent = "⧉";
    btn.addEventListener("click", () => {
      const raw = code ? code.textContent : pre.textContent;
      const text = buildSourceHeader(langMatch?.[1]) + raw;
      writeToClipboard(text)
        .then(() => {
          btn.textContent = "✓";
          btn.classList.add("copied");
          setTimeout(() => {
            btn.textContent = "⧉";
            btn.classList.remove("copied");
          }, 2000);
        })
        .catch(() => onCopyError());
    });
    pre.appendChild(btn);
  });
}

/* Keep addCopyButtons as alias so existing tests referencing it still compile */
function addCopyButtons(contentEl, onCopyError = () => {}) {
  addCodeBlockHeader(contentEl, onCopyError);
}

/* ─── Quiz-me mode for complexity tables ─── */

const COMPLEXITY_HEADER_RE = /\b(time|space|complexity|best|worst|average)\b/i;
const BIG_O_RE = /[OΘΩ]\s*\(/;

function _isQuizzableTable(table) {
  const headText = table.querySelector("thead, tr")?.textContent || "";
  if (COMPLEXITY_HEADER_RE.test(headText)) return true;
  return [...table.querySelectorAll("td")].some((td) => BIG_O_RE.test(td.textContent));
}

function addQuizTables(contentEl) {
  contentEl.querySelectorAll("table").forEach((table) => {
    if (!_isQuizzableTable(table)) return;
    table.classList.add("quiz-table");
    table.querySelectorAll("tbody tr, tr").forEach((row) => {
      const cells = [...row.querySelectorAll("td")];
      cells.slice(1).forEach((td) => td.classList.add("quiz-cell"));
    });
  });
}

function _revealQuizCell(td) {
  if (!td.classList.contains("quiz-blurred")) return;
  td.classList.remove("quiz-blurred");
  recordReveal(state.currentFilePath);
}

const QuizMode = {
  active: false,

  toggle() {
    const tables = document.querySelectorAll("#markdown-body .quiz-table");
    if (!tables.length) return;
    this.active = !this.active;
    document.querySelectorAll("#markdown-body .quiz-cell").forEach((td) => {
      td.classList.toggle("quiz-blurred", this.active);
    });
  },

  bind(contentEl) {
    contentEl.addEventListener("click", (e) => {
      const td = e.target.closest(".quiz-cell.quiz-blurred");
      if (td) _revealQuizCell(td);
    });
  },

  reset() {
    this.active = false;
  },
};

/* ─── Callout Styling ─── */
function styleCallouts(contentEl) {
  contentEl.querySelectorAll("blockquote").forEach((bq) => {
    const text = bq.textContent.trim();
    let calloutClass = null;
    if (text.startsWith("🎯")) calloutClass = "callout-interview";
    else if (text.startsWith("⚠️") || text.startsWith("⚠")) calloutClass = "callout-warning";
    else if (text.startsWith("🧠")) calloutClass = "callout-thought";
    else if (text.startsWith("⚖️") || text.startsWith("⚖")) calloutClass = "callout-decision";
    if (!calloutClass) return;
    bq.classList.add("callout", calloutClass);

    // Strip leading emoji from first paragraph so CSS ::before doesn't duplicate it
    const firstP = bq.querySelector("p");
    if (firstP?.firstChild?.nodeType === Node.TEXT_NODE) {
      const t = firstP.firstChild.textContent;
      const chars = [...t];
      const skip = chars[1] === "️" ? 2 : 1;
      let rest = chars.slice(skip).join("").trimStart();
      if (rest.startsWith("+")) {
        rest = rest.slice(1).trimStart();
        bq.dataset.collapsed = "true";
      }
      firstP.firstChild.textContent = rest;
    }
  });
}

/* ─── Prerequisites Chips ─── */
function renderPrerequisites(contentEl) {
  const ps = Array.from(contentEl.querySelectorAll("p"));
  const prereqP = ps.find((p) => p.textContent.trim().startsWith("Prerequisites:"));
  if (!prereqP) return;

  const links = Array.from(prereqP.querySelectorAll("a"));
  if (!links.length) return;

  const container = document.createElement("div");
  container.className = "prereqs-container";
  container.innerHTML = `<span class="prereqs-label">Prerequisites:</span>`;

  links.forEach((link) => {
    const chip = document.createElement("a");
    chip.className = "prereq-chip";
    chip.href = link.getAttribute("href");
    chip.innerHTML = link.innerHTML;
    container.appendChild(chip);
  });

  const h1 = contentEl.querySelector("h1");
  if (h1?.nextSibling) {
    contentEl.insertBefore(container, h1.nextSibling);
  } else {
    contentEl.prepend(container);
  }
  prereqP.remove();
}

/* ─── TOC Builder ─── */
function buildTOC(contentEl, wikiId, articlePath) {
  const tocNav = document.getElementById("toc-nav");
  const sidebar = document.getElementById("toc-sidebar");
  const headings = Array.from(contentEl.querySelectorAll("h2, h3, h4"));

  if (headings.length === 0) {
    sidebar.style.display = "none";
    return;
  }
  sidebar.style.display = "";
  tocNav.innerHTML = "";

  let currentGroup = null;

  headings.forEach((h) => {
    const a = document.createElement("a");
    const tag = h.tagName;
    a.className = `toc-item ${tag === "H3" ? "toc-h3" : tag === "H4" ? "toc-h4" : "toc-h2"}`;
    a.textContent = h.textContent.replace(/[#]+$/, "").trim();
    a.href = `#${h.id}`;

    a.addEventListener("click", (e) => {
      e.preventDefault();
      h.scrollIntoView({ behavior: "smooth", block: "start" });
      h.classList.add("toc-heading-pulse");
      setTimeout(() => h.classList.remove("toc-heading-pulse"), 600);
      const url = new URL(location.href);
      url.searchParams.set("a", h.id);
      history.replaceState(history.state, "", url.toString());
    });

    if (tag === "H2") {
      currentGroup = document.createElement("div");
      currentGroup.className = "toc-h2-group";
      currentGroup.dataset.h2Id = h.id;

      const collapseKey = `wiki-toc-h2-${wikiId}-${h.id}`;
      if (getCollapsed(collapseKey)) {
        currentGroup.classList.add("section--collapsed");
      }

      const chevron = document.createElement("button");
      chevron.className = "toc-group-chevron";
      chevron.setAttribute("aria-label", "Toggle section");
      chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,3 5,7 8,3"/></svg>`;
      chevron.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowCollapsed = toggleCollapse(collapseKey, currentGroup);
        _syncContentH2(h.id, nowCollapsed);
      });

      const h2Row = document.createElement("div");
      h2Row.className = "toc-h2-row";
      h2Row.appendChild(a);
      h2Row.appendChild(chevron);
      currentGroup.appendChild(h2Row);
      tocNav.appendChild(currentGroup);
    } else {
      if (currentGroup) {
        currentGroup.appendChild(a);
      } else {
        tocNav.appendChild(a);
      }
    }
  });

  // IntersectionObserver for active highlight + breathing states
  state.tocObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = tocNav.querySelector(`a[href="#${entry.target.id}"]`);
        if (link) link._intersecting = entry.isIntersecting;
      });

      let topmostEl = null;
      for (const h of headings) {
        if (h._tocLink?._intersecting) {
          topmostEl = h;
          break;
        }
      }

      let foundCurrent = false;
      for (const h of headings) {
        const link = tocNav.querySelector(`a[href="#${h.id}"]`);
        if (!link) continue;
        if (h === topmostEl) {
          link.classList.remove("toc-passed");
          link.classList.add("toc-current");
          link.setAttribute("aria-current", "true");
          foundCurrent = true;
          link.scrollIntoView({ block: "nearest" });
        } else if (!foundCurrent) {
          link.classList.add("toc-passed");
          link.classList.remove("toc-current");
          link.removeAttribute("aria-current");
        } else {
          link.classList.remove("toc-passed", "toc-current");
          link.removeAttribute("aria-current");
        }
      }
    },
    { rootMargin: "0px 0px -60% 0px", threshold: 0 },
  );

  headings.forEach((h) => {
    h._tocLink = tocNav.querySelector(`a[href="#${h.id}"]`);
    state.tocObserver.observe(h);
  });

  if (wikiId && articlePath) {
    const offset = restoreTOCScroll(wikiId, articlePath);
    if (offset > 0) sidebar.scrollTop = offset;

    let _scrollTimer = null;
    sidebar._tocScrollHandler = () => {
      clearTimeout(_scrollTimer);
      _scrollTimer = setTimeout(() => saveTOCScroll(wikiId, articlePath, sidebar.scrollTop), 300);
    };
    sidebar.addEventListener("scroll", sidebar._tocScrollHandler);
  }
}

/* ─── Heading Anchor Links ─── */
function addAnchorLinks(contentEl, onCopyError = () => {}, onCopySuccess = () => {}) {
  contentEl.querySelectorAll("h2, h3, h4").forEach((h) => {
    if (!h.id) return;
    const btn = document.createElement("button");
    btn.className = "anchor-btn";
    btn.title = "Copy link";
    btn.setAttribute("aria-label", "Copy link to section");
    btn.innerHTML = anchorIcon();
    btn.addEventListener("click", () => {
      const url = new URL(location.href);
      url.searchParams.set("a", h.id);
      writeToClipboard(url.toString())
        .then(() => {
          btn.classList.add("copied");
          setTimeout(() => btn.classList.remove("copied"), 2000);
          onCopySuccess();
        })
        .catch(() => onCopyError());
    });
    h.appendChild(btn);
  });
}

function anchorIcon() {
  return `<svg viewBox="0 0 16 16" fill="none">
    <path d="M6.5 9.5l3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M4.5 11.5a2.5 2.5 0 010-3.54L6 6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M11.5 4.5a2.5 2.5 0 010 3.54L10 9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* ─── Image Lightbox ─── */
function addImageLightbox(contentEl) {
  contentEl.querySelectorAll("img").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const placeholder = document.createElement("div");
        placeholder.className = "img-error-placeholder";
        placeholder.setAttribute("role", "img");
        const altText = img.alt || "Image failed to load";
        placeholder.setAttribute("aria-label", altText);
        const icon = document.createElement("span");
        icon.className = "img-error-icon";
        icon.textContent = "🖼";
        const label = document.createElement("span");
        label.className = "img-error-text";
        label.textContent = altText;
        placeholder.appendChild(icon);
        placeholder.appendChild(label);
        img.replaceWith(placeholder);
      },
      { once: true },
    );
    img.loading = "lazy";
    img.classList.add("zoomable-img");
    img.addEventListener("click", () => {
      const clone = img.cloneNode();
      clone.style.cursor = "";
      openZoomOverlay(clone, img.alt);
    });
  });
}

/* ─── Mermaid Diagrams ─── */
async function renderMermaidDiagrams(contentEl) {
  if (typeof mermaid === "undefined") return;
  const blocks = contentEl.querySelectorAll("pre code.language-mermaid");
  let i = 0;
  for (const block of blocks) {
    const pre = block.parentElement;
    const code = block.textContent.trim();
    try {
      const id = `mermaid-${Date.now()}-${i++}`;
      const { svg } = await mermaid.render(id, code);
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-diagram";
      wrapper.dataset.mermaidSrc = code;
      wrapper.innerHTML = svg;
      pre.replaceWith(wrapper);
    } catch (err) {
      console.warn("Mermaid render failed:", err);
      const errEl = document.createElement("div");
      errEl.className = "mermaid-error";
      errEl.textContent = "Diagram syntax error — could not render";
      pre.replaceWith(errEl);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   MERMAID NODE HOVER CAPTIONS
   ═══════════════════════════════════════════════════════════════ */
function _parseMermaidCaptions(src) {
  const map = {};
  const re = /^%%\s*node-caption:\s*(\S+)\s+"([^"]+)"/gm;
  for (let m = re.exec(src); m !== null; m = re.exec(src)) {
    map[m[1].toLowerCase()] = m[2];
  }
  return map;
}

function _getMermaidTooltip() {
  let tip = document.getElementById("mermaid-node-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "mermaid-node-tooltip";
    tip.className = "mermaid-node-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.setAttribute("aria-live", "polite");
    document.body.appendChild(tip);
  }
  return tip;
}

function addMermaidNodeCaptions(contentEl) {
  const diagrams = contentEl.querySelectorAll(".mermaid-diagram[data-mermaid-src]");
  const hasAnyCaptions = [...diagrams].some((d) => {
    const src = d.dataset.mermaidSrc || "";
    return Object.keys(_parseMermaidCaptions(src)).length > 0;
  });
  if (!hasAnyCaptions) {
    document.getElementById("mermaid-node-tooltip")?.remove();
    return;
  }

  const tip = _getMermaidTooltip();

  diagrams.forEach((diagram) => {
    const src = diagram.dataset.mermaidSrc || "";
    const captions = _parseMermaidCaptions(src);
    if (!Object.keys(captions).length) return;

    const svg = diagram.querySelector("svg");
    if (!svg) return;

    // Mermaid renders nodes as <g> with class containing node id, or as <g id="...">
    svg.querySelectorAll("g[id], g[class]").forEach((el) => {
      const elId = (el.id || "").toLowerCase();
      const elClass = (el.className?.baseVal || "").toLowerCase();
      const labelEl = el.querySelector(".label, text, .nodeLabel");
      const labelText = labelEl?.textContent?.trim().toLowerCase() || "";

      const fuzzyKey = Object.keys(captions).find((k) => elClass.includes(k) || elId.includes(k));
      const caption =
        captions[elId] || captions[labelText] || (fuzzyKey ? captions[fuzzyKey] : null);

      if (!caption) return;

      el.classList.add("has-node-caption");
      el.addEventListener("mouseenter", (e) => {
        tip.textContent = caption;
        tip.classList.add("visible");
        _positionTooltip(tip, e);
      });
      el.addEventListener("mousemove", (e) => _positionTooltip(tip, e));
      el.addEventListener("mouseleave", () => tip.classList.remove("visible"));
    });
  });
}

function _positionTooltip(tip, e) {
  const pad = 12;
  let x = e.clientX + pad;
  let y = e.clientY + pad;
  const rect = tip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - pad) x = e.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - pad) y = e.clientY - rect.height - pad;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

/* ─── Diagram Zoom ─── */
function _appendMermaidCopyBtn(diagram) {
  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn mermaid-copy-btn";
  copyBtn.title = "Copy diagram as SVG";
  copyBtn.setAttribute("aria-label", "Copy diagram as SVG");
  copyBtn.textContent = "⧉";
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const svgEl = diagram.querySelector("svg");
    if (!svgEl) return;
    const svgText = new XMLSerializer().serializeToString(svgEl);
    writeToClipboard(svgText).then(() => {
      copyBtn.textContent = "✓";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = "⧉";
        copyBtn.classList.remove("copied");
      }, 2000);
    });
  });
  diagram.appendChild(copyBtn);
}

function addDiagramZoom(contentEl) {
  contentEl.querySelectorAll(".mermaid-diagram").forEach((diagram) => {
    diagram.addEventListener("click", () => {
      const svgEl = diagram.querySelector("svg");
      if (!svgEl) return;
      const clone = svgEl.cloneNode(true);
      // Preserve viewBox so CSS can size it; set explicit 100% dims so
      // the element has a non-zero bounding box inside the flex overlay.
      clone.removeAttribute("width");
      clone.removeAttribute("height");
      clone.setAttribute("width", "100%");
      clone.setAttribute("height", "100%");
      clone.classList.add("zoom-diagram-svg");
      openZoomOverlay(clone);
    });

    _appendMermaidCopyBtn(diagram);
  });
}

/* ─── Mermaid Theme Sync ─── */
function getMermaidThemeConfig(theme) {
  if (theme === "light") {
    return {
      theme: "default",
      themeVariables: {
        darkMode: false,
        primaryColor: "#6366f1",
        primaryTextColor: "#1e293b",
        primaryBorderColor: "#e2e8f0",
        lineColor: "#94a3b8",
      },
    };
  }
  return {
    theme: "dark",
    themeVariables: {
      darkMode: true,
      background: "#161b27",
      primaryColor: "#6366f1",
      primaryTextColor: "#f1f5f9",
      primaryBorderColor: "#252d42",
      lineColor: "#64748b",
      secondaryColor: "#1e2537",
      tertiaryColor: "#252d42",
    },
  };
}

async function rerenderMermaidDiagrams() {
  if (typeof mermaid === "undefined") return;
  const contentEl = document.getElementById("markdown-body");
  if (!contentEl) return;
  const diagrams = contentEl.querySelectorAll(".mermaid-diagram[data-mermaid-src]");
  if (!diagrams.length) return;

  const theme = document.documentElement.getAttribute("data-theme") || "dark";
  mermaid.initialize({ startOnLoad: false, ...getMermaidThemeConfig(theme) });

  const inViewport = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };

  let i = 0;
  for (const wrapper of diagrams) {
    if (!inViewport(wrapper)) continue;
    const code = wrapper.dataset.mermaidSrc;
    try {
      const id = `mermaid-rerender-${Date.now()}-${i++}`;
      const { svg } = await mermaid.render(id, code);
      wrapper.innerHTML = svg;
      _appendMermaidCopyBtn(wrapper);
    } catch (err) {
      console.warn("Mermaid re-render failed:", err);
      const errEl = document.createElement("div");
      errEl.className = "mermaid-error";
      errEl.textContent = "Diagram syntax error — could not render";
      wrapper.replaceChildren(errEl);
    }
  }
}

/* ─── Table Column Sort ─── */
function addTableSort(contentEl) {
  contentEl.querySelectorAll("table").forEach((table) => {
    const thead = table.querySelector("thead");
    if (!thead) return;
    const ths = Array.from(thead.querySelectorAll("th"));
    if (!ths.length) return;

    let sortCol = -1;
    let sortAsc = true;

    ths.forEach((th, colIdx) => {
      th.classList.add("sortable-th");
      th.setAttribute("role", "button");
      th.setAttribute("tabindex", "0");
      th.setAttribute("aria-label", `Sort by ${th.textContent.trim()}`);

      const doSort = () => {
        if (sortCol === colIdx) {
          sortAsc = !sortAsc;
        } else {
          sortCol = colIdx;
          sortAsc = true;
        }
        ths.forEach((h, i) => {
          h.classList.toggle("sort-asc", i === colIdx && sortAsc);
          h.classList.toggle("sort-desc", i === colIdx && !sortAsc);
        });

        const tbody = table.querySelector("tbody") || table;
        const rows = Array.from(tbody.querySelectorAll("tr"));
        rows.sort((a, b) => {
          const aText = a.cells[colIdx]?.textContent.trim() ?? "";
          const bText = b.cells[colIdx]?.textContent.trim() ?? "";
          const aNum = Number.parseFloat(aText);
          const bNum = Number.parseFloat(bText);
          const cmp =
            !Number.isNaN(aNum) && !Number.isNaN(bNum)
              ? aNum - bNum
              : aText.localeCompare(bText, undefined, { numeric: true });
          return sortAsc ? cmp : -cmp;
        });
        rows.forEach((r) => tbody.appendChild(r));
      };

      th.addEventListener("click", doSort);
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          doSort();
        }
      });
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   MATH FORMULA VARIABLE-SUBSTITUTION TOGGLE
   ═══════════════════════════════════════════════════════════════ */

const VAR_MAP = {
  // Time / rates
  T: "time",
  t: "time",
  λ: "arrival rate",
  μ: "service rate",
  τ: "latency",
  ρ: "utilization",
  ω: "frequency",
  // Sizing
  n: "size",
  N: "total",
  m: "count",
  k: "partitions",
  B: "block size",
  b: "bits",
  W: "width",
  H: "height",
  // Probability / stats
  p: "probability",
  q: "failure prob",
  σ: "std dev",
  α: "alpha",
  β: "beta",
  θ: "threshold",
  // Complexity
  f: "function",
  g: "growth",
  L: "length",
  S: "space",
  // Common single-letters that should stay symbolic
  // (intentionally omitted: e, i, j, x, y, z — too ambiguous)
};

function _substituteLatex(latex) {
  // Replace isolated single-letter variables (not inside \commands) with \text{word}
  return latex.replace(/(?<!\\)([a-zA-Zα-ωΑ-Ω])(?=[^a-zA-Zα-ωΑ-Ω_{]|$)/gu, (match) => {
    return VAR_MAP[match] ? `\\text{${VAR_MAP[match]}}` : match;
  });
}

function addFormulaToggle(contentEl) {
  if (typeof katex === "undefined") return;

  contentEl.querySelectorAll(".katex-display").forEach((block) => {
    const annotation = block.querySelector("annotation[encoding='application/x-tex']");
    if (!annotation) return;
    const originalLatex = annotation.textContent.trim();
    const substituted = _substituteLatex(originalLatex);
    if (substituted === originalLatex) return; // nothing to swap — skip

    let expanded = false;
    const btn = document.createElement("button");
    btn.className = "formula-toggle-btn";
    btn.title = "Toggle variable names";
    btn.setAttribute("aria-label", "Toggle variable names");
    btn.textContent = "αβ";

    // Wrap existing katex span so we can swap it without touching buttons
    const katexSpan = block.querySelector(".katex");
    if (!katexSpan) return;
    const wrapper = document.createElement("span");
    wrapper.className = "formula-toggle-wrapper";
    katexSpan.parentNode.insertBefore(wrapper, katexSpan);
    wrapper.appendChild(katexSpan);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      expanded = !expanded;
      btn.classList.toggle("active", expanded);
      btn.title = expanded ? "Show symbols" : "Toggle variable names";
      const latex = expanded ? substituted : originalLatex;
      try {
        const tmp = document.createElement("span");
        // katex.renderToString is safe — output is generated by the KaTeX library
        // from a LaTeX string we control (extracted from the page's own annotation node)
        tmp.innerHTML = katex.renderToString(latex, { displayMode: false, throwOnError: false }); // eslint-disable-line no-unsanitized/property
        wrapper.replaceChildren(tmp.firstElementChild || tmp);
      } catch (_) {
        expanded = !expanded;
        btn.classList.toggle("active", expanded);
      }
    });

    block.style.position = "relative";
    block.appendChild(btn);
  });
}

/* ─── LaTeX Copy Buttons ─── */
function addLatexCopyButtons(contentEl, onCopyError = () => {}) {
  contentEl.querySelectorAll(".katex-display").forEach((block) => {
    const annotation = block.querySelector("annotation[encoding='application/x-tex']");
    if (!annotation) return;
    const latex = annotation.textContent.trim();

    const btn = document.createElement("button");
    btn.className = "copy-btn latex-copy-btn";
    btn.title = "Copy LaTeX";
    btn.setAttribute("aria-label", "Copy LaTeX");
    btn.textContent = "⧉";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      writeToClipboard(latex)
        .then(() => {
          btn.textContent = "✓";
          btn.classList.add("copied");
          setTimeout(() => {
            btn.textContent = "⧉";
            btn.classList.remove("copied");
          }, 2000);
        })
        .catch(() => onCopyError());
    });
    block.style.position = "relative";
    block.appendChild(btn);
  });
}

/* ─── hljs Theme Sync ─── */
const HLJS_DARK =
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
const HLJS_LIGHT =
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css";

function syncHljsTheme() {
  const link = document.getElementById("hljs-theme-css");
  if (!link) return;
  const theme = document.documentElement.getAttribute("data-theme") || "dark";
  link.href = theme === "light" ? HLJS_LIGHT : HLJS_DARK;
}

/* ─── Table Scroll Cue ─── */
function addTableScrollCues(contentEl) {
  contentEl.querySelectorAll("table").forEach((table) => {
    const wrap = document.createElement("div");
    wrap.className = "table-scroll-wrap";
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);

    const updateCue = () => {
      const overflows = wrap.scrollWidth > wrap.clientWidth + 4;
      const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 4;
      wrap.classList.toggle("scroll-cue", overflows && !atEnd);
    };

    wrap.addEventListener("scroll", updateCue, { passive: true });
    const ro = new ResizeObserver(updateCue);
    ro.observe(wrap);
    state.tableResizeObservers.push(ro);
    updateCue();
  });
}

/* ═══════════════════════════════════════════════════════════════
   COLLAPSIBLE LONG CODE BLOCKS
   ═══════════════════════════════════════════════════════════════ */
function addCollapsibleCodeBlocks(contentEl) {
  contentEl.querySelectorAll("pre").forEach((pre) => {
    const code = pre.querySelector("code");
    const lineCount = (code || pre).textContent.split("\n").length;
    if (lineCount <= 20) return;

    pre.classList.add("pre--collapsible");

    const btn = document.createElement("button");
    btn.className = "code-expand-btn";
    btn.textContent = "Show more";
    btn.addEventListener("click", () => {
      const expanded = pre.classList.toggle("pre--expanded");
      btn.textContent = expanded ? "Show less" : "Show more";
      if (!expanded) pre.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    pre.appendChild(btn);
  });
}

function addPreOverflowDetection(contentEl) {
  contentEl.querySelectorAll("pre").forEach((pre) => {
    const update = () => {
      pre.classList.toggle("pre--overflowing", pre.scrollWidth > pre.clientWidth + 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(pre);
    state.preResizeObservers.push(ro);
  });
}

/* ═══════════════════════════════════════════════════════════════
   CODE BLOCK LINE NUMBERS
   ═══════════════════════════════════════════════════════════════ */
function addLineNumbers(contentEl) {
  contentEl.querySelectorAll("pre code").forEach((code) => {
    if (code.classList.contains("language-mermaid")) return;
    const lines = code.innerHTML.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    if (lines.length < 3) return;
    code.innerHTML = lines.map((line) => `<span class="code-line">${line}</span>`).join("\n");
    code.parentElement.classList.add("has-line-numbers");
  });
}

/* ═══════════════════════════════════════════════════════════════
   CODE LANGUAGE LABELS
   ═══════════════════════════════════════════════════════════════ */
/* Label is now rendered inside code-header by addCodeBlockHeader */
function addCodeLangLabels(_contentEl) {}

/* ═══════════════════════════════════════════════════════════════
   COLLAPSIBLE CALLOUT BLOCKS
   ═══════════════════════════════════════════════════════════════ */
const CALLOUT_COLLAPSE_LINES_DESKTOP = 10;
const CALLOUT_COLLAPSE_LINES_MOBILE = 5;
const APPROX_LINE_HEIGHT_PX = 24;

function addCollapsibleCallouts(contentEl) {
  const isMobile = window.innerWidth < 768;
  const lineLimit = isMobile ? CALLOUT_COLLAPSE_LINES_MOBILE : CALLOUT_COLLAPSE_LINES_DESKTOP;
  const heightThreshold = lineLimit * APPROX_LINE_HEIGHT_PX;

  contentEl.querySelectorAll("blockquote.callout").forEach((bq) => {
    const startsCollapsed = bq.dataset.collapsed === "true";
    if (!startsCollapsed && bq.scrollHeight <= heightThreshold) return;

    bq.classList.add("callout--collapsible");

    const btn = document.createElement("button");
    btn.className = "callout-expand-btn";
    btn.textContent = "Show more";
    btn.addEventListener("click", () => {
      const expanded = bq.classList.toggle("callout--expanded");
      btn.textContent = expanded ? "Show less" : "Show more";
    });
    bq.insertAdjacentElement("afterend", btn);
  });
}

/* ═══════════════════════════════════════════════════════════════
   TYPEWRITER FOCUS MODE
   ═══════════════════════════════════════════════════════════════ */
let _focusMode = false;
let _focusObserver = null;

const FOCUS_SELECTORS = "p, li, blockquote, pre, h2, h3";

function _syncFocusBtn() {
  const btn = document.getElementById("content-focus-btn");
  if (btn) {
    btn.classList.toggle("active", _focusMode);
    btn.title = _focusMode ? "Exit focus mode (F)" : "Focus mode (F)";
  }
  const prefsBtn = document.getElementById("prefs-focus-toggle");
  if (prefsBtn) {
    prefsBtn.classList.toggle("active", _focusMode);
    prefsBtn.setAttribute("aria-pressed", String(_focusMode));
  }
  const announcer = document.getElementById("a11y-announcer");
  if (announcer) announcer.textContent = _focusMode ? "Focus mode on" : "Focus mode off";
}

function toggleFocusMode() {
  const contentEl = document.getElementById("markdown-body");
  if (!contentEl) return;
  _focusMode = !_focusMode;
  contentEl.classList.toggle("focus-mode", _focusMode);
  _syncFocusBtn();

  if (_focusMode) {
    _focusObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("focus-para", entry.isIntersecting);
        });
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 },
    );
    contentEl.querySelectorAll(FOCUS_SELECTORS).forEach((el) => {
      _focusObserver.observe(el);
    });
  } else {
    _cleanupFocusObserver(contentEl);
  }
}

function cleanupFocusMode() {
  if (!_focusMode) return;
  _focusMode = false;
  _syncFocusBtn();
  const contentEl = document.getElementById("markdown-body");
  if (contentEl) {
    contentEl.classList.remove("focus-mode");
    _cleanupFocusObserver(contentEl);
  }
}

function _cleanupFocusObserver(contentEl) {
  if (_focusObserver) {
    _focusObserver.disconnect();
    _focusObserver = null;
  }
  contentEl.querySelectorAll(".focus-para").forEach((el) => {
    el.classList.remove("focus-para");
  });
}

/* ═══════════════════════════════════════════════════════════════
   PER-HEADING COLLAPSE TOGGLES (H2 on content page)
   ═══════════════════════════════════════════════════════════════ */
function _setSectionCollapsed(h2, collapsed) {
  if (collapsed) {
    h2.classList.add("section--collapsed");
  } else {
    h2.classList.remove("section--collapsed");
  }
  const sectionId = h2.dataset.sectionId;
  if (!sectionId) return;
  h2.parentElement?.querySelectorAll(`[data-h2-body="${sectionId}"]`).forEach((el) => {
    el.hidden = collapsed;
  });
}

function injectHeadingCollapseToggles(contentEl, wikiId, articlePath) {
  const slugBase = articlePath.replace(/\//g, "-");
  contentEl.querySelectorAll("h2").forEach((h2) => {
    if (h2.querySelector(".heading-collapse-btn")) return;

    const key = `wiki-heading-collapsed-${wikiId}-${slugBase}-${h2.id}`;
    const sectionId = h2.id || `h2-${Math.random().toString(36).slice(2)}`;
    h2.dataset.sectionId = sectionId;

    const btn = document.createElement("button");
    btn.className = "heading-collapse-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Toggle section");
    btn.innerHTML =
      '<svg viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    h2.appendChild(btn);

    let next = h2.nextElementSibling;
    while (next && !/^H[12]$/.test(next.tagName)) {
      next.dataset.h2Body = sectionId;
      next = next.nextElementSibling;
    }

    const isCollapsed = getCollapsed(key);
    _setSectionCollapsed(h2, isCollapsed);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const nowCollapsed = !h2.classList.contains("section--collapsed");
      toggleCollapse(key, h2, nowCollapsed);
      _setSectionCollapsed(h2, nowCollapsed);
      _syncTocGroup(sectionId, nowCollapsed);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   STICKY CURRENT SECTION HEADER
   ═══════════════════════════════════════════════════════════════ */
function addStickySection(contentEl) {
  const h2s = Array.from(contentEl.querySelectorAll("h2"));
  const banner = document.getElementById("sticky-section-header");
  if (!banner || h2s.length === 0) return;

  const TOPBAR_H = 44;

  const update = () => {
    const scrollY = window.scrollY + TOPBAR_H + 2;
    let current = null;
    for (const h of h2s) {
      if (h.getBoundingClientRect().top + window.scrollY <= scrollY) {
        current = h;
      }
    }
    if (current) {
      banner.textContent = current.textContent.replace(/#+\s*$/, "").trim();
      banner.classList.add("visible");
      document.body.classList.add("sticky-header-visible");
    } else {
      banner.classList.remove("visible");
      document.body.classList.remove("sticky-header-visible");
    }
  };

  state.stickySectionHandler = update;
  window.addEventListener("scroll", update, { passive: true });
  update();
}

function cleanupStickySection() {
  if (state.stickySectionHandler) {
    window.removeEventListener("scroll", state.stickySectionHandler);
    state.stickySectionHandler = null;
  }
  const banner = document.getElementById("sticky-section-header");
  if (banner) {
    banner.classList.remove("visible");
    document.body.classList.remove("sticky-header-visible");
  }
}

/* ═══════════════════════════════════════════════════════════════
   IN-ARTICLE FIND - "/" find bar over the article body
   ═══════════════════════════════════════════════════════════════ */
const ArticleFind = {
  _open: false,
  _hits: [],
  _idx: -1,
  _query: "",

  _els() {
    return {
      bar: document.getElementById("article-find"),
      input: document.getElementById("article-find-input"),
      count: document.getElementById("article-find-count"),
    };
  },

  open() {
    const { bar, input } = this._els();
    if (!bar || !input) return;
    this._open = true;
    bar.classList.remove("hidden");
    input.focus();
    input.select();
  },

  close() {
    const { bar, input } = this._els();
    this._clearHits();
    this._open = false;
    this._query = "";
    if (bar) bar.classList.add("hidden");
    if (input) input.value = "";
    this._updateCount();
  },

  isOpen() {
    return this._open;
  },

  _clearHits() {
    const body = document.getElementById("markdown-body");
    if (body) {
      body.querySelectorAll("mark.article-find-hit").forEach((m) => {
        const parent = m.parentNode;
        parent.replaceChild(document.createTextNode(m.textContent), m);
        parent.normalize();
      });
    }
    this._hits = [];
    this._idx = -1;
  },

  setQuery(q) {
    this._clearHits();
    this._query = q;
    if (q.trim().length >= 1) this._highlightAll(q.trim());
    this._updateCount();
    if (this._hits.length) this._select(0);
  },

  /* wraps matches in-place (no innerHTML rebuild) so handlers/widgets survive */
  _highlightAll(query) {
    const body = document.getElementById("markdown-body");
    if (!body) return;
    const ql = query.toLowerCase();

    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const tag = node.parentNode?.nodeName;
        if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
        return node.nodeValue.toLowerCase().includes(ql)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });

    const targets = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) targets.push(n);

    for (const textNode of targets) {
      this._wrapMatches(textNode, ql);
    }
  },

  _wrapMatches(textNode, ql) {
    let node = textNode;
    let lower = node.nodeValue.toLowerCase();
    let pos = lower.indexOf(ql);
    while (pos !== -1) {
      const after = node.splitText(pos);
      const matchNode = after.splitText(ql.length);
      const mark = document.createElement("mark");
      mark.className = "article-find-hit";
      mark.textContent = after.nodeValue;
      after.parentNode.replaceChild(mark, after);
      this._hits.push(mark);
      node = matchNode;
      lower = node.nodeValue.toLowerCase();
      pos = lower.indexOf(ql);
    }
  },

  _select(idx) {
    if (!this._hits.length) return;
    if (this._idx >= 0 && this._hits[this._idx])
      this._hits[this._idx].classList.remove("article-find-hit--current");
    this._idx = (idx + this._hits.length) % this._hits.length;
    const cur = this._hits[this._idx];
    cur.classList.add("article-find-hit--current");
    cur.scrollIntoView({ block: "center", behavior: "smooth" });
    this._updateCount();
  },

  next() {
    if (this._hits.length) this._select(this._idx + 1);
  },

  prev() {
    if (this._hits.length) this._select(this._idx - 1);
  },

  _updateCount() {
    const { count } = this._els();
    if (!count) return;
    if (!this._query.trim()) count.textContent = "";
    else if (!this._hits.length) count.textContent = "0/0";
    else count.textContent = `${this._idx + 1}/${this._hits.length}`;
  },
};

(function _bindArticleFind() {
  const input = document.getElementById("article-find-input");
  const nextBtn = document.getElementById("article-find-next");
  const prevBtn = document.getElementById("article-find-prev");
  const closeBtn = document.getElementById("article-find-close");
  if (!input) return;

  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => ArticleFind.setQuery(input.value), 120);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.shiftKey ? ArticleFind.prev() : ArticleFind.next();
    } else if (e.key === "Escape") {
      e.preventDefault();
      ArticleFind.close();
    }
  });
  nextBtn?.addEventListener("click", () => ArticleFind.next());
  prevBtn?.addEventListener("click", () => ArticleFind.prev());
  closeBtn?.addEventListener("click", () => ArticleFind.close());
})();

/* ═══════════════════════════════════════════════════════════════
   TABBED CODE BLOCKS
   ═══════════════════════════════════════════════════════════════ */
const TABS_LAST_LANG_KEY = "tabs-last-lang";

function _parseBlockId(pre) {
  const code = pre.querySelector("code");
  if (!code) return null;
  const firstLine = code.firstChild;
  if (!firstLine || firstLine.nodeType !== Node.TEXT_NODE) return null;
  const match = firstLine.textContent.match(/^(?:#|\/\/)\s*id="([^"]+)"\n?/);
  if (!match) return null;
  firstLine.textContent = firstLine.textContent.replace(/^(?:#|\/\/)\s*id="[^"]+"\n?/, "");
  return match[1];
}

function _getLang(pre) {
  const code = pre.querySelector("code");
  const m = code?.className.match(/language-(\w+)/);
  return m ? m[1] : "text";
}

function _buildTabWidget(groupId, title, pres) {
  const langs = pres.map(_getLang);
  const blockIds = pres.map(_parseBlockId);
  const langCounts = langs.reduce((acc, l) => {
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});
  const labels = langs.map((lang, i) =>
    langCounts[lang] > 1 ? blockIds[i] || `${lang}-${i}` : lang,
  );

  const lastLang = sessionStorage.getItem(TABS_LAST_LANG_KEY);
  let activeIdx = langs.indexOf(lastLang);
  if (activeIdx === -1) activeIdx = 0;

  const widget = document.createElement("div");
  widget.className = "code-tabs";
  widget.dataset.tabsId = groupId;

  const header = document.createElement("div");
  header.className = "code-tabs-header";

  if (title) {
    const titleEl = document.createElement("span");
    titleEl.className = "code-tabs-title";
    titleEl.textContent = title;
    header.appendChild(titleEl);
  }

  const bar = document.createElement("div");
  bar.className = "code-tabs-bar";
  bar.setAttribute("role", "tablist");

  const panels = document.createElement("div");
  panels.className = "code-tabs-panels";

  pres.forEach((pre, i) => {
    const btn = document.createElement("button");
    btn.className = `code-tab${i === activeIdx ? " active" : ""}`;
    btn.setAttribute("role", "tab");
    btn.dataset.lang = langs[i];
    btn.dataset.panel = String(i);
    btn.textContent = labels[i];
    bar.appendChild(btn);

    const panel = document.createElement("div");
    panel.className = `code-tab-panel${i === activeIdx ? " active" : ""}`;
    panel.dataset.panel = String(i);
    if (i !== activeIdx) panel.hidden = true;
    panel.appendChild(pre);
    panels.appendChild(panel);
  });

  header.appendChild(bar);
  widget.appendChild(header);
  widget.appendChild(panels);

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".code-tab");
    if (!btn) return;
    const idx = Number.parseInt(btn.dataset.panel, 10);
    bar.querySelectorAll(".code-tab").forEach((b) => b.classList.remove("active"));
    panels.querySelectorAll(".code-tab-panel").forEach((p) => {
      p.classList.remove("active");
      p.hidden = true;
    });
    btn.classList.add("active");
    const activePanel = panels.querySelector(`.code-tab-panel[data-panel="${idx}"]`);
    activePanel.classList.add("active");
    activePanel.hidden = false;
    sessionStorage.setItem(TABS_LAST_LANG_KEY, btn.dataset.lang);
  });

  return widget;
}

function addTabbedCodeBlocks(contentEl) {
  contentEl.querySelectorAll("div[data-tabs-id]").forEach((wrapper) => {
    const groupId = wrapper.dataset.tabsId;
    const title = wrapper.dataset.tabsTitle || null;
    const pres = [...wrapper.querySelectorAll("pre")];
    if (pres.length < 2) return;
    const widget = _buildTabWidget(groupId, title, pres);
    wrapper.replaceWith(widget);
  });
}

/* ═══════════════════════════════════════════════════════════════
   INLINE CAVEAT REVEALS  [?caveat text]
   ═══════════════════════════════════════════════════════════════ */
const CAVEAT_RE = /\[\\?\?([^\]]+)\]/g;

function addInlineCaveats(contentEl) {
  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentNode?.nodeName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "CODE" || tag === "PRE") {
        return NodeFilter.FILTER_REJECT;
      }
      return CAVEAT_RE.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const targets = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    CAVEAT_RE.lastIndex = 0;
    targets.push(n);
  }

  for (const textNode of targets) {
    CAVEAT_RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    m = CAVEAT_RE.exec(textNode.nodeValue);
    while (m !== null) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(textNode.nodeValue.slice(last, m.index)));
      }
      const marker = document.createElement("span");
      marker.className = "caveat-marker";
      marker.setAttribute("role", "button");
      marker.setAttribute("tabindex", "0");
      marker.setAttribute("aria-expanded", "false");
      const body = document.createElement("span");
      body.className = "caveat-body";
      body.textContent = m[1];
      body.setAttribute("aria-hidden", "true");
      marker.appendChild(body);

      const toggle = () => {
        const expanded = marker.getAttribute("aria-expanded") === "true";
        marker.setAttribute("aria-expanded", String(!expanded));
        body.setAttribute("aria-hidden", String(expanded));
      };
      marker.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      marker.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });

      frag.appendChild(marker);
      last = m.index + m[0].length;
      m = CAVEAT_RE.exec(textNode.nodeValue);
    }
    if (last < textNode.nodeValue.length) {
      frag.appendChild(document.createTextNode(textNode.nodeValue.slice(last)));
    }
    textNode.parentNode.replaceChild(frag, textNode);
  }
}

/* ─── Glossary Term Hover Popovers ─── */
let _glossaryCache = null;

function _loadGlossary() {
  if (!_glossaryCache) {
    _glossaryCache = fetch("data/glossary.json")
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        for (const [k, v] of Object.entries(data)) map[k.toLowerCase()] = v;
        return map;
      })
      .catch(() => ({}));
  }
  return _glossaryCache;
}

function _getOrCreateGlossaryPopover() {
  let pop = document.getElementById("glossary-popover");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "glossary-popover";
    pop.className = "glossary-popover";
    pop.setAttribute("role", "tooltip");
    document.body.appendChild(pop);
  }
  return pop;
}

function _positionPopover(pop, anchor) {
  const rect = anchor.getBoundingClientRect();
  const gap = 8;
  let top = rect.bottom + gap + window.scrollY;
  let left = rect.left + window.scrollX;

  pop.style.visibility = "hidden";
  pop.style.display = "block";
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  pop.style.display = "";
  pop.style.visibility = "";

  if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
  if (left < 8) left = 8;
  if (rect.bottom + gap + ph > window.innerHeight) top = rect.top - ph - gap + window.scrollY;

  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

function addInlineGlossaryExpand(contentEl) {
  const abbrs = Array.from(contentEl.querySelectorAll("abbr"));
  if (!abbrs.length) return;

  _loadGlossary().then((glossary) => {
    const matched = abbrs.filter((el) => glossary[el.textContent.trim().toLowerCase()]);
    if (!matched.length) return;

    matched.forEach((abbr) => {
      const def = glossary[abbr.textContent.trim().toLowerCase()];
      if (!def) return;

      abbr.classList.add("glossary-term", "glossary-term--expandable");
      abbr.setAttribute("role", "button");
      abbr.setAttribute("tabindex", "0");
      abbr.setAttribute("aria-expanded", "false");

      const expand = document.createElement("span");
      expand.className = "glossary-inline-def";
      expand.textContent = def;
      expand.setAttribute("aria-hidden", "true");
      abbr.after(expand);

      const toggle = () => {
        const open = abbr.getAttribute("aria-expanded") === "true";
        abbr.setAttribute("aria-expanded", String(!open));
        expand.setAttribute("aria-hidden", String(open));
        expand.classList.toggle("glossary-inline-def--open", !open);
      };

      abbr.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      abbr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });

      document.addEventListener(
        "click",
        (e) => {
          if (!abbr.contains(e.target) && !expand.contains(e.target)) {
            abbr.setAttribute("aria-expanded", "false");
            expand.setAttribute("aria-hidden", "true");
            expand.classList.remove("glossary-inline-def--open");
          }
        },
        { passive: true },
      );
    });
  });
}

function addGlossaryTerms(contentEl) {
  const abbrs = Array.from(contentEl.querySelectorAll("abbr"));
  if (!abbrs.length) return;

  _loadGlossary().then((glossary) => {
    const matched = abbrs.filter((el) => glossary[el.textContent.trim().toLowerCase()]);
    if (!matched.length) return;

    const pop = _getOrCreateGlossaryPopover();
    let hideTimer = null;

    const show = (el) => {
      clearTimeout(hideTimer);
      const def = glossary[el.textContent.trim().toLowerCase()];
      if (!def) return;
      pop.textContent = def;
      _positionPopover(pop, el);
      pop.classList.add("glossary-popover--visible");
    };

    const hide = () => {
      hideTimer = setTimeout(() => pop.classList.remove("glossary-popover--visible"), 120);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.addEventListener("mouseenter", () => show(el));
            el.addEventListener("mouseleave", hide);
            el.addEventListener("focus", () => show(el));
            el.addEventListener("blur", hide);
          } else {
            el.replaceWith(el.cloneNode(true));
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    matched.forEach((el) => {
      el.classList.add("glossary-term");
      observer.observe(el);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   SESSION HTML CACHE
   ═══════════════════════════════════════════════════════════════ */
const _HTML_CACHE_PREFIX = "wiki-html-cache-";

function cacheRenderedHtml(filePath, html) {
  try {
    sessionStorage.setItem(_HTML_CACHE_PREFIX + filePath, html);
  } catch {}
}

function getCachedHtml(filePath) {
  try {
    return sessionStorage.getItem(_HTML_CACHE_PREFIX + filePath);
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   FOOTNOTES
   ═══════════════════════════════════════════════════════════════ */
function addFootnotes(contentEl) {
  const defMap = {};
  const defEls = [];

  contentEl.querySelectorAll("p").forEach((p) => {
    const m = p.textContent.match(/^\[\^(\w+)\]:\s*(.+)$/s);
    if (m) {
      defMap[m[1]] = m[2].trim();
      defEls.push(p);
    }
  });

  if (Object.keys(defMap).length === 0) return;

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (!/\[\^/.test(text)) return;
      const frag = document.createDocumentFragment();
      let last = 0;
      const re = /\[\^(\w+)\]/g;
      let m = re.exec(text);
      while (m !== null) {
        const label = m[1];
        if (defMap[label]) {
          frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          const sup = document.createElement("sup");
          sup.className = "footnote-ref";
          const a = document.createElement("a");
          a.href = `#fn-${label}`;
          a.id = `fnref-${label}`;
          a.textContent = label;
          sup.appendChild(a);
          frag.appendChild(sup);
          last = m.index + m[0].length;
        }
        m = re.exec(text);
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      !["SCRIPT", "CODE", "PRE"].includes(node.tagName)
    ) {
      Array.from(node.childNodes).forEach(walk);
    }
  };
  walk(contentEl);

  defEls.forEach((el) => el.remove());

  const section = document.createElement("section");
  section.className = "footnotes";
  const ol = document.createElement("ol");
  ol.className = "footnotes-list";
  Object.entries(defMap).forEach(([label, text]) => {
    const li = document.createElement("li");
    li.id = `fn-${label}`;
    li.className = "footnote-item";
    li.appendChild(document.createTextNode(`${text} `));
    const back = document.createElement("a");
    back.href = `#fnref-${label}`;
    back.className = "footnote-backref";
    back.setAttribute("aria-label", "Back to reference");
    back.textContent = "↩";
    li.appendChild(back);
    ol.appendChild(li);
  });
  section.appendChild(ol);
  contentEl.appendChild(section);
}

/* ═══════════════════════════════════════════════════════════════
   ARTICLE END-MARKER
   ═══════════════════════════════════════════════════════════════ */
function addArticleEndMarker(contentEl) {
  if (contentEl.querySelector(".article-end-marker")) return;
  const marker = document.createElement("div");
  marker.className = "article-end-marker";
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = "⌘";
  contentEl.appendChild(marker);
}

/* ═══════════════════════════════════════════════════════════════
   PROGRESS RING ON SCROLL-TO-TOP BUTTON
   ═══════════════════════════════════════════════════════════════ */
const _RING_R = 17;
const _RING_CIRC = 2 * Math.PI * _RING_R;

function initProgressRingScrollTop() {
  const btn = document.getElementById("scroll-top");
  if (!btn || btn.querySelector(".scroll-top-ring")) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "scroll-top-ring");
  svg.setAttribute("viewBox", "0 0 42 42");
  svg.setAttribute("aria-hidden", "true");

  const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  track.setAttribute("class", "scroll-top-ring-track");
  track.setAttribute("cx", "21");
  track.setAttribute("cy", "21");
  track.setAttribute("r", String(_RING_R));
  track.setAttribute("fill", "none");

  const fill = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  fill.setAttribute("class", "scroll-top-ring-fill");
  fill.setAttribute("cx", "21");
  fill.setAttribute("cy", "21");
  fill.setAttribute("r", String(_RING_R));
  fill.setAttribute("fill", "none");
  fill.setAttribute("stroke-dasharray", String(_RING_CIRC));
  fill.setAttribute("stroke-dashoffset", String(_RING_CIRC));

  svg.appendChild(track);
  svg.appendChild(fill);
  btn.appendChild(svg);
}

function updateProgressRing(pct) {
  const fill = document.querySelector(".scroll-top-ring-fill");
  if (!fill) return;
  fill.setAttribute("stroke-dashoffset", String(_RING_CIRC * (1 - pct)));
}

/* ═══════════════════════════════════════════════════════════════
   TOC ↔ CONTENT HEADING COLLAPSE SYNC
   ═══════════════════════════════════════════════════════════════ */
function _syncTocGroup(h2Id, collapsed) {
  const tocGroup = document.querySelector(`.toc-h2-group[data-h2-id="${CSS.escape(h2Id)}"]`);
  if (!tocGroup) return;
  if (collapsed) {
    tocGroup.classList.add("section--collapsed");
  } else {
    tocGroup.classList.remove("section--collapsed");
  }
}

function _syncContentH2(h2Id, collapsed) {
  const h2 = document.querySelector(`#markdown-body h2[data-section-id="${CSS.escape(h2Id)}"]`);
  if (!h2) return;
  _setSectionCollapsed(h2, collapsed);
}

export {
  syncHljsTheme,
  addLatexCopyButtons,
  addFormulaToggle,
  addTableSort,
  closeZoomOverlay,
  addCodeBlockHeader,
  addCopyButtons,
  styleCallouts,
  renderPrerequisites,
  buildTOC,
  addAnchorLinks,
  renderMermaidDiagrams,
  addLineNumbers,
  addCollapsibleCodeBlocks,
  addCollapsibleCallouts,
  addCodeLangLabels,
  addImageLightbox,
  addDiagramZoom,
  addMermaidNodeCaptions,
  rerenderMermaidDiagrams,
  addTableScrollCues,
  addPreOverflowDetection,
  addQuizTables,
  QuizMode,
  toggleFocusMode,
  cleanupFocusMode,
  addStickySection,
  cleanupStickySection,
  injectHeadingCollapseToggles,
  ArticleFind,
  addTabbedCodeBlocks,
  addGlossaryTerms,
  addInlineCaveats,
  addInlineGlossaryExpand,
  cacheRenderedHtml,
  getCachedHtml,
  addFootnotes,
  addArticleEndMarker,
  initProgressRingScrollTop,
  updateProgressRing,
};
