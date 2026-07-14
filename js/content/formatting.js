import { writeToClipboard } from "./code-blocks.js";

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

/* ─── Heading Anchor Links ─── */
function addAnchorLinks(contentEl, onCopyError = () => {}, onCopySuccess = () => {}) {
  contentEl.querySelectorAll("h2, h3, h4").forEach((h) => {
    if (!h.id) return;
    const btn = document.createElement("button");
    btn.className = "anchor-btn";
    btn.title = "Copy link";
    btn.setAttribute("aria-label", "Copy link to section");
    btn.innerHTML = anchorIcon();
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
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
  return `<svg class="icon"><use href="#icon-anchor"></use></svg>`;
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
  // (intentionally omitted: e, i, j, x, y, z - too ambiguous)
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
    if (substituted === originalLatex) return; // nothing to swap - skip

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
        // katex.renderToString is safe - output is generated by the KaTeX library
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

/* ═══════════════════════════════════════════════════════════════
   TYPEWRITER FOCUS MODE
   ═══════════════════════════════════════════════════════════════ */
let _focusMode = false;
let _focusObserver = null;

const FOCUS_SELECTORS = "p, li, blockquote, pre, h2, h3";

function isFocusMode() {
  return _focusMode;
}

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

/* ═══════════════════════════════════════════════════════════════
   HIDE-AND-REVEAL STUDY MODE
   ═══════════════════════════════════════════════════════════════ */
let _studyMode = false;

function _setH3Revealed(h3, revealed) {
  h3.classList.toggle("study-revealed", revealed);
  const sectionId = h3.dataset.h3SectionId;
  if (!sectionId) return;
  h3.parentElement?.querySelectorAll(`[data-h3-body="${sectionId}"]`).forEach((el) => {
    el.hidden = !revealed;
  });
}

function _wireStudySection(h3) {
  const sectionId = h3.dataset.h3SectionId || `h3-${Math.random().toString(36).slice(2)}`;
  h3.dataset.h3SectionId = sectionId;

  let next = h3.nextElementSibling;
  while (next && !/^H[234]$/.test(next.tagName)) {
    next.dataset.h3Body = sectionId;
    next = next.nextElementSibling;
  }

  if (!h3._studyClickHandler) {
    const handler = () => _setH3Revealed(h3, !h3.classList.contains("study-revealed"));
    h3._studyClickHandler = handler;
    h3.addEventListener("click", handler);
  }
}

function isStudyMode() {
  return _studyMode;
}

function toggleStudyMode() {
  const contentEl = document.getElementById("markdown-body");
  if (!contentEl) return;
  _studyMode = !_studyMode;
  contentEl.classList.toggle("study-mode", _studyMode);

  contentEl.querySelectorAll("h3").forEach((h3) => {
    _wireStudySection(h3);
    _setH3Revealed(h3, !_studyMode);
  });

  const announcer = document.getElementById("a11y-announcer");
  if (announcer) announcer.textContent = _studyMode ? "Study mode on" : "Study mode off";
}

function cleanupStudyMode() {
  if (!_studyMode) return;
  _studyMode = false;
  const contentEl = document.getElementById("markdown-body");
  if (contentEl) {
    contentEl.classList.remove("study-mode");
    contentEl.querySelectorAll("h3").forEach((h3) => _setH3Revealed(h3, true));
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

export {
  styleCallouts,
  addCollapsibleCallouts,
  renderPrerequisites,
  addAnchorLinks,
  addFormulaToggle,
  addLatexCopyButtons,
  toggleFocusMode,
  cleanupFocusMode,
  isFocusMode,
  toggleStudyMode,
  cleanupStudyMode,
  isStudyMode,
  ArticleFind,
  addTabbedCodeBlocks,
  addFootnotes,
  addArticleEndMarker,
};
