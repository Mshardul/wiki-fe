import {
  WIKIS,
  state,
  indexCache,
  readTimeCache,
  markStubPath,
  getShapeFingerprint,
  saveShapeFingerprint,
  STUB_THRESHOLD,
  mdConverter,
  escHtml,
  fuzzyMatch,
} from "./state.js";
import {
  addToRecents,
  updateBookmarkBtn,
  updateReadBtn,
  updateOfflineBtn,
  renderBookmarksSection,
  renderRecentsSection,
  isRead,
  markRead,
  markUnread,
  Bookmarks,
} from "./storage.js";
import {
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
  addTableScrollCues,
  addQuizTables,
  QuizMode,
  cleanupFocusMode,
  addStickySection,
  cleanupStickySection,
  ArticleFind,
} from "./content.js";

/* ═══════════════════════════════════════════════════════════════
   VIEW MANAGEMENT
   ═══════════════════════════════════════════════════════════════ */
const progressBar = document.getElementById("reading-progress");

function showView(id) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  state.currentView = id.replace("view-", "");

  if (id !== "view-index") window.scrollTo(0, 0);

  const isContent = id === "view-content";
  progressBar.classList.toggle("visible", isContent);
  if (isContent) progressBar.style.width = "0%";
}

/* ═══════════════════════════════════════════════════════════════
   HASH ROUTER
   url scheme: wiki.html  →  wiki.html#system-design  →  wiki.html#system-design/message-queues
   ═══════════════════════════════════════════════════════════════ */
function navigate(hash, pushHistory = true) {
  if (pushHistory) {
    // Explicitly reconstruct URL with pathname to strip away location.search query params
    const url = location.pathname + (hash ? `#${hash}` : "");
    history.pushState({ hash }, "", url);
  }
  route(hash || "");
}

let _routeTimer = null;
function route(hash) {
  clearTimeout(_routeTimer);
  _routeTimer = setTimeout(() => _execRoute(hash), 0);
}
function _execRoute(hash) {
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0) {
    updatePageTitle("Home");
    renderHome();
    return;
  }

  const wikiId = parts[0];
  const wiki = WIKIS.find((w) => w.id === wikiId);
  if (!wiki) {
    updatePageTitle("Not Found");
    history.replaceState(null, "", location.pathname);
    renderHome();
    return;
  }

  if (parts.length === 1) {
    updatePageTitle(wiki.title);
    renderIndex(wiki);
    return;
  }

  // Content view
  const slug = parts[1];
  const savedPath = history.state?.filePath;
  const savedTitle = history.state?.title;
  if (savedPath) {
    renderContent(wiki, savedPath, savedTitle || slug);
  } else {
    resolveSlugAndRender(wiki, slug);
  }
}

async function resolveSlugAndRender(wiki, slug) {
  try {
    const md = await fetchText(wiki.indexPath);
    const basePath = dirOf(wiki.indexPath);
    const sections = parseIndexMd(md, basePath);
    const cards = [];
    for (const section of sections) {
      for (const card of section.cards) {
        if (card.slug === slug) {
          renderContent(wiki, card.path, card.title, false);
          return;
        }
        cards.push(card);
      }
    }

    const suggestion = nearestSlugMatch(slug, cards);
    if (suggestion) {
      updatePageTitle("Not Found");
      history.replaceState(null, "", location.pathname);
      renderHome();
      showToast(
        `No "${slug}" — did you mean ${suggestion.title}?`,
        8000,
        () => navigate(`${wiki.id}/${suggestion.slug}`),
        "Open"
      );
      return;
    }
  } catch {}

  // Slug not found, no near match
  updatePageTitle("Not Found");
  showToast(`Article not found: "${slug}"`);
  history.replaceState(null, "", location.pathname);
  renderHome();
}

/* Rank index cards against a bad slug; return the closest, or null */
function nearestSlugMatch(slug, cards) {
  const q = slug.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const card of cards) {
    const cardSlug = (card.slug || "").toLowerCase();
    const cardTitle = (card.title || "").toLowerCase();
    let score = 0;
    if (cardSlug.includes(q) || q.includes(cardSlug)) score = 90;
    else if (fuzzyMatch(q, cardSlug)) score = 60;
    else if (fuzzyMatch(q, cardTitle)) score = 30;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

/* ═══════════════════════════════════════════════════════════════
   VIEW 1 - HOME
   ═══════════════════════════════════════════════════════════════ */
function renderHome() {
  const grid = document.getElementById("wiki-grid");
  grid.innerHTML = WIKIS.map(
    (w) => `
    <div class="wiki-card${
      state.currentWikiId === w.id ? " active" : ""
    }" data-wiki-id="${w.id}" onclick="navigate('${
      w.id
    }')" role="button" tabindex="0"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();navigate('${
           w.id
         }')}">
      <div class="wiki-card-icon">${w.icon}</div>
      <div class="wiki-card-body">
        <h2 class="wiki-card-title">${w.title}</h2>
        <p class="wiki-card-desc">${w.description}</p>
      </div>
      <div class="wiki-card-footer">
        <span class="wiki-card-count">0 articles</span>
        <span class="wiki-card-arrow">→</span>
      </div>
    </div>
  `
  ).join("");

  showView("view-home");
  updateArticleCounts();
}

/* ═══════════════════════════════════════════════════════════════
   VIEW 2 - WIKI INDEX
   ═══════════════════════════════════════════════════════════════ */
async function renderIndex(wiki) {
  state.currentWikiId = wiki.id;

  // Breadcrumb & hero
  setBreadcrumb("index-breadcrumb", [
    { label: "Home", href: "#" },
    { label: wiki.title },
  ]);
  document.getElementById("index-title").textContent = wiki.title;
  document.getElementById("index-subtitle").textContent = wiki.description;

  showView("view-index");
  bindIndexCardSwipe(wiki);
  renderRecentsSection(wiki);
  renderBookmarksSection(wiki);
  IndexFilter.reset();

  const sectionsEl = document.getElementById("index-sections");
  sectionsEl.innerHTML =
    '<div class="loading" style="padding:3rem;text-align:center;color:var(--text-muted);font-size:.875rem">Loading…</div>';

  try {
    const md = await fetchText(wiki.indexPath);
    const basePath = dirOf(wiki.indexPath);
    state.indexSections = parseIndexMd(md, basePath);
    renderIndexSections(state.indexSections, wiki);
    IndexFilter.apply();

    sectionsEl.classList.add("index-sections--loading");
    const scheduleIdle =
      window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1));
    scheduleIdle(() =>
      populateIndexReadTimes().finally(() =>
        sectionsEl.classList.remove("index-sections--loading")
      )
    );

    const savedScroll = localStorage.getItem(`wiki-index-scroll-${wiki.id}`);
    if (savedScroll) {
      void document.documentElement.scrollHeight;
      window.scrollTo({ top: parseInt(savedScroll, 10), behavior: "instant" });
    }
  } catch (err) {
    sectionsEl.innerHTML = `<p class="error">Failed to load index. (${escHtml(err.message)})</p>`;
  }
}

function renderIndexSections(sections, wiki) {
  const container = document.getElementById("index-sections");
  container.innerHTML = sections
    .map((section) => {
      const collapseKey = `wiki-section-collapsed-${wiki.id}-${section.heading}`;
      const isCollapsed = !!localStorage.getItem(collapseKey);
      const escapedHeading = section.heading
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
      return `
    <div class="index-section${
      isCollapsed ? " section--collapsed" : ""
    }" data-section="${escHtml(section.heading)}">
      <div class="section-header"
           role="button" tabindex="0"
           onclick="toggleSection(this,'${wiki.id}','${escapedHeading}')"
           onkeydown="if(event.key==='Enter'||event.key===' '){toggleSection(this,'${
             wiki.id
           }','${escapedHeading}');event.preventDefault()}">
        <h2 class="section-title">${escHtml(section.heading)}</h2>
        <span class="section-count">${section.cards.length}</span>
        <span class="section-chevron">›</span>
      </div>
      <div class="index-card-grid">
        <p class="index-section-empty">No articles available in this section yet.</p>
        ${section.cards
          .map(
            (card) => `
          <div class="index-card"
               data-title="${escHtml(card.title)}"
               data-desc="${escHtml(card.description)}"
               aria-label="${escHtml(card.title)}"
               onclick="navigateToContent('${wiki.id}', '${encodeURIComponent(
              card.path
            )}', '${encodeURIComponent(card.title)}', '${card.slug}')"
               role="button" tabindex="0"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
            <div class="index-card-header">
              <span class="index-card-title">${escHtml(card.title)}</span>
              <span class="index-card-arrow">→</span>
            </div>
            <p class="index-card-desc">${escHtml(card.description)}</p>
            <div class="index-card-meta">
              <span class="index-card-read-time" data-path="${escHtml(
                card.path
              )}">…</span>
              <span class="index-card-read-dot ${
                isRead(card.path) ? "visible" : ""
              }" title="Read"></span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
    })
    .join("");
}

/* ═══════════════════════════════════════════════════════════════
   INDEX FILTER - live text filter + unread-only toggle
   ═══════════════════════════════════════════════════════════════ */
const IndexFilter = {
  _query: "",
  _unread: false,
  _pendingUnread: false,
  _debounce: null,

  /* applied on the next index render — lets a command arm it before navigating */
  requestUnread() {
    this._pendingUnread = true;
  },

  reset() {
    this._query = "";
    this._unread = this._pendingUnread;
    this._pendingUnread = false;
    const input = document.getElementById("index-filter-input");
    if (input) input.value = "";
    this._syncUnreadBtn();
  },

  _syncUnreadBtn() {
    const btn = document.getElementById("index-filter-unread");
    if (!btn) return;
    btn.classList.toggle("active", this._unread);
    btn.setAttribute("aria-pressed", String(this._unread));
  },

  setQuery(q) {
    this._query = q.trim().toLowerCase();
    this.apply();
  },

  toggleUnread() {
    this._unread = !this._unread;
    this._syncUnreadBtn();
    this.apply();
  },

  apply() {
    const sections = document.querySelectorAll("#index-sections .index-section");
    sections.forEach((sectionEl) => {
      let visible = 0;
      sectionEl.querySelectorAll(".index-card").forEach((card) => {
        const title = (card.dataset.title || "").toLowerCase();
        const desc = (card.dataset.desc || "").toLowerCase();
        const path = card.querySelector(".index-card-read-time[data-path]")
          ?.dataset.path;
        const matchesText =
          !this._query || title.includes(this._query) || desc.includes(this._query);
        const matchesUnread = !this._unread || (path && !isRead(path));
        const show = matchesText && matchesUnread;
        card.classList.toggle("index-card--filtered", !show);
        if (show) visible++;
      });
      sectionEl.classList.toggle("index-section--no-matches", visible === 0);
    });
  },
};

const _indexFilterInput = document.getElementById("index-filter-input");
if (_indexFilterInput) {
  _indexFilterInput.addEventListener("input", () => {
    clearTimeout(IndexFilter._debounce);
    IndexFilter._debounce = setTimeout(
      () => IndexFilter.setQuery(_indexFilterInput.value),
      120
    );
  });
}
const _indexFilterUnreadBtn = document.getElementById("index-filter-unread");
if (_indexFilterUnreadBtn) {
  _indexFilterUnreadBtn.addEventListener("click", () =>
    IndexFilter.toggleUnread()
  );
}

/* ─── Index-card swipe: right = bookmark, left = read toggle ─── */
const CARD_SWIPE_THRESHOLD = 50;
const CARD_SWIPE_DEADZONE = 8;
let _cardSwipeBound = false;
let _swipeWiki = null; // current wiki for the delegated index-card swipe

function bindIndexCardSwipe(wiki) {
  _swipeWiki = wiki;
  const container = document.getElementById("index-sections");
  if (!container || _cardSwipeBound) return;
  _cardSwipeBound = true;

  let card = null;
  let sx = 0;
  let sy = 0;
  let axis = null; // null | "x" | "y"

  const pathOf = (c) =>
    c.querySelector(".index-card-read-time[data-path]")?.dataset.path || null;

  const reset = () => {
    if (card) {
      card.style.transition = "transform 180ms ease";
      card.style.transform = "";
      card.classList.remove("card-swiping", "swipe-right", "swipe-left");
      const c = card;
      setTimeout(() => {
        c.style.transition = "";
      }, 200);
    }
    card = null;
    axis = null;
  };

  container.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      const el = e.target.closest(".index-card");
      if (!el || el.classList.contains("index-card--unavailable")) return;
      card = el;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      axis = null;
      card.style.transition = "";
    },
    { passive: true }
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (!card || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      if (!axis) {
        if (Math.abs(dx) < CARD_SWIPE_DEADZONE && Math.abs(dy) < CARD_SWIPE_DEADZONE)
          return;
        axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
        if (axis === "x") card.classList.add("card-swiping");
        else {
          card = null; // vertical → let the page scroll, abandon swipe
          return;
        }
      }
      if (axis === "x") {
        e.preventDefault(); // claim the horizontal gesture
        card.style.transform = `translateX(${dx}px)`;
        card.classList.toggle("swipe-right", dx > 0);
        card.classList.toggle("swipe-left", dx < 0);
      }
    },
    { passive: false }
  );

  container.addEventListener(
    "touchend",
    (e) => {
      if (!card || axis !== "x") {
        reset();
        return;
      }
      const dx = (e.changedTouches[0]?.clientX ?? sx) - sx;
      const path = pathOf(card);
      if (path && dx > CARD_SWIPE_THRESHOLD) {
        const now = Bookmarks.togglePath(
          _swipeWiki.id,
          path,
          card.querySelector(".index-card-title")?.textContent
        );
        renderBookmarksSection(_swipeWiki);
        showToast(now ? "Bookmarked" : "Bookmark removed");
      } else if (path && dx < -CARD_SWIPE_THRESHOLD) {
        if (isRead(path)) {
          markUnread(path);
          showToast("Marked unread");
        } else {
          markRead(path);
          showToast("Marked read");
        }
      }
      reset();
    },
    { passive: true }
  );

  container.addEventListener("touchcancel", reset, { passive: true });
}

function toggleSection(headerEl, wikiId, heading) {
  const section = headerEl.closest(".index-section");
  const isCollapsed = section.classList.toggle("section--collapsed");
  const key = `wiki-section-collapsed-${wikiId}-${heading}`;
  if (isCollapsed) {
    localStorage.setItem(key, "1");
  } else {
    localStorage.removeItem(key);
  }
}

/* ─── Reading time ─── */
function readingTime(text) {
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

async function populateIndexReadTimes() {
  const badges = Array.from(
    document.querySelectorAll(".index-card-read-time[data-path]")
  );

  await Promise.all(
    badges.map(async (badge) => {
      const rawPath = badge.dataset.path;
      if (!rawPath) return;
      const path = normalizePath(rawPath);
      try {
        if (readTimeCache[path] === undefined) {
          const md = await fetchText(rawPath);
          if (md.length < STUB_THRESHOLD) markStubPath(path);
          else readTimeCache[path] = readingTime(md);
        }
        const isStub = readTimeCache[path] === null;
        const card = badge.closest(".index-card");
        if (isStub && card) {
          card.classList.add("index-card--unavailable");
          card.removeAttribute("onclick");
          card.removeAttribute("tabindex");
          card.setAttribute("aria-disabled", "true");
          card.title = "Coming soon — this article hasn't been written yet";
          const dot = card.querySelector(".index-card-read-dot");
          if (dot) dot.remove();
        }
        badge.textContent = isStub ? "Coming soon" : readTimeCache[path];
      } catch {
        badge.textContent = "";
      }
    })
  );

  // Update section counts to available (non-stub) articles only
  document.querySelectorAll(".index-section").forEach((sectionEl) => {
    const countEl = sectionEl.querySelector(".section-count");
    if (!countEl) return;
    const cards = sectionEl.querySelectorAll(".index-card");
    const available = sectionEl.querySelectorAll(
      ".index-card:not(.index-card--unavailable)"
    );
    countEl.textContent = available.length;

    // Mark sections where every card is a stub
    if (cards.length > 0 && available.length === 0) {
      sectionEl.classList.add("section--all-stubs");
    }
  });
}

/* ─── Shared index cache (used by article counts + global search) ─── */
async function fetchWikiIndex(wiki) {
  if (indexCache[wiki.id]) return indexCache[wiki.id];
  const ssKey = `wiki-index-${wiki.id}`;
  try {
    const hit = sessionStorage.getItem(ssKey);
    if (hit) {
      indexCache[wiki.id] = JSON.parse(hit);
      return indexCache[wiki.id];
    }
  } catch {}
  const md = await fetchText(wiki.indexPath);
  const basePath = dirOf(wiki.indexPath);
  const sections = parseIndexMd(md, basePath);
  indexCache[wiki.id] = sections;
  try {
    sessionStorage.setItem(ssKey, JSON.stringify(sections));
  } catch {
    // Quota full: evict all other wiki-index-* entries then retry once
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("wiki-index-") && k !== ssKey)
        sessionStorage.removeItem(k);
    }
    try {
      sessionStorage.setItem(ssKey, JSON.stringify(sections));
    } catch {}
  }
  return sections;
}

async function updateArticleCounts() {
  for (const wiki of WIKIS) {
    try {
      const sections = await fetchWikiIndex(wiki);
      const count = sections.reduce((sum, s) => sum + s.cards.length, 0);
      const el = document.querySelector(
        `[data-wiki-id="${wiki.id}"] .wiki-card-count`
      );
      if (el) el.textContent = `${count} articles`;
    } catch {}
  }
}

/* ─── Index.md Parser ─── */
function parseIndexMd(markdown, basePath) {
  const sections = [];
  const skipHeadings = ["how to use", "contributing"];

  const normalized = markdown.replace(/\r\n/g, "\n");
  const chunks = normalized.split(/\n(?=## )/);

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const firstLine = lines[0];
    if (!firstLine.startsWith("## ")) continue;

    const heading = firstLine.replace(/^## /, "").trim();
    if (skipHeadings.some((s) => heading.toLowerCase().includes(s))) continue;

    const cards = [];

    for (const line of lines) {
      if (!line.startsWith("|")) continue;
      if (/^\|\s*[-:]+/.test(line)) continue; // separator row

      // Match table data rows: | [Title](./path.md) | Description text |
      const m = line.match(
        /^\|\s*\[([^\]]+)\]\(([^)]+\.md)\)\s*\|\s*([^|]+?)\s*\|/
      );
      if (m) {
        const title = m[1].trim();
        const relPath = m[2].trim();
        const description = m[3].trim();

        // Resolve relative path: ./components/foo.md → basePath/components/foo.md
        const fullPath = basePath + "/" + relPath.replace(/^\.\//, "");
        const slug = relPath.split("/").pop().replace(/\.md$/, "");

        cards.push({ title, path: fullPath, slug, description });
      } else if (line.includes("](")) {
        console.warn("parseIndexMd: malformed row skipped:", line.slice(0, 80));
      }
    }

    if (cards.length) sections.push({ heading, cards });
  }

  return sections;
}

/* ═══════════════════════════════════════════════════════════════
   VIEW 3 - CONTENT
   ═══════════════════════════════════════════════════════════════ */

function normalizePath(path) {
  const stack = [];
  for (const p of path.split("/")) {
    if (p === "..") {
      if (stack.length) stack.pop();
    } else if (p && p !== ".") stack.push(p);
  }
  return stack.join("/");
}

let _renderGen = 0;

function navigateToContent(wikiId, encodedPath, encodedTitle, slug) {
  const filePath = decodeURIComponent(encodedPath);
  const title = decodeURIComponent(encodedTitle);
  const wiki = WIKIS.find((w) => w.id === wikiId);
  renderContent(wiki, filePath, title, true, slug);
}

async function renderContent(
  wiki,
  filePath,
  title,
  pushNav = true,
  slug = null
) {
  filePath = normalizePath(filePath);
  const gen = ++_renderGen;

  state.currentWikiId = wiki.id;
  state.currentFilePath = filePath;
  state.currentTitle = title;

  updatePageTitle(title);

  const derivedSlug = slug || filePath.split("/").pop().replace(/\.md$/, "");

  if (pushNav) {
    const url = location.pathname + `#${wiki.id}/${derivedSlug}`;
    history.pushState(
      { hash: `${wiki.id}/${derivedSlug}`, filePath, title },
      "",
      url
    );
  }

  // Breadcrumb
  setBreadcrumb("content-breadcrumb", [
    { label: "Home", href: "#" },
    { label: wiki.title, href: `#${wiki.id}` },
    { label: title },
  ]);

  // Back button → return to index
  const backBtn = document.getElementById("content-back-btn");
  backBtn.onclick = () => navigate(wiki.id);

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
      readTimeBadge.textContent =
        readTimeCache[filePath] || readingTime(markdown);
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
      buildTOC(body);
      body.dataset.renderDone = "1";
      return;
    }

    // DOMPurify (XSS Protection)
    const rawHtml = mdConverter.makeHtml(markdown);
    body.innerHTML =
      typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml;

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

    // Syntax highlighting
    if (typeof hljs !== "undefined") {
      body
        .querySelectorAll("pre code")
        .forEach((block) => hljs.highlightElement(block));
    }

    // Post-processing — enhancements only.
    try {
      // Line numbers (after hljs so it runs on highlighted HTML)
      addLineNumbers(body);

      addCodeBlockHeader(body, () =>
        showToast("Copy failed — clipboard access denied")
      );
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
        () => showToast("Copy failed — clipboard access denied"),
        () => showToast("Link copied")
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
            firstNode.replaceWith(
              accentSpan,
              document.createTextNode(text.slice(spaceIdx))
            );
          }
        }
      }

      // TOC
      buildTOC(body);
      addStickySection(body);

      // Code language labels + collapsible long blocks
      addCodeLangLabels(body);
      addCollapsibleCodeBlocks(body);

      // Inline SVG diagrams (must run before lightbox/zoom claim them)
      await inlineSvgImages(body);

      // Lazy-load remaining raster images
      body
        .querySelectorAll("img:not([loading])")
        .forEach((img) => img.setAttribute("loading", "lazy"));

      // Image lightbox + diagram zoom + table scroll cues
      addImageLightbox(body);
      addDiagramZoom(body);
      addTableScrollCues(body);

      // Related articles
      renderRelatedArticles(wiki, filePath);

      // Topbar button states
      updateBookmarkBtn();
      updateReadBtn();
      updateOfflineBtn();
    } catch {
      showToast("Some content enhancements failed to load");
    }

    // Record this article's shape so the next visit can render a mirror skeleton
    saveShapeFingerprint(filePath, {
      headings: body.querySelectorAll("h2, h3").length,
      codeBlocks: body.querySelectorAll("pre").length,
    });

    // Topbar Title Observer
    if (state.titleObserver) {
      state.titleObserver.disconnect();
      state.titleObserver = null;
    }
    const topbarTitle = document.getElementById("topbar-title");
    if (topbarTitle) {
      topbarTitle.textContent = title;
      topbarTitle.classList.remove("visible");
      const h1 = body.querySelector("h1");
      if (h1) {
        state.titleObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            // Show title if h1 is scrolled ABOVE the viewport
            topbarTitle.classList.toggle(
              "visible",
              !entry.isIntersecting && entry.boundingClientRect.top < 0
            );
          },
          { rootMargin: "-44px 0px 0px 0px" }
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
            target.scrollIntoView({ behavior: "smooth", block: "start" })
          )
        );
    }

    if (!anchor) {
      const _saved = localStorage.getItem(`scroll-${wiki.id}-${filePath}`);
      if (_saved) {
        const _targetY = parseInt(_saved, 10);
        document.fonts.ready.then(() =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (gen !== _renderGen || state.currentView !== "content") return;
              window.scrollTo({ top: _targetY, behavior: "instant" });
            })
          )
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
  { capture: true }
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
      if (previewEl) previewEl.classList.remove("visible");
    });

    // Hover logic — skip on touch
    link.addEventListener("mouseenter", () => {
      if (_lastPointerWasTouch) return;
      hoverPreviewTimer = setTimeout(
        () => showHoverPreview(link, resolvedPath),
        400
      );
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
      { passive: true }
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
      { passive: true }
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
  { passive: true }
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
    previewEl.classList.remove(
      "hover-preview--sheet",
      "hover-preview--sheet-open"
    );
    // Position preview — prefer below, flip above when near viewport bottom
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
  previewEl.classList.add("visible");

  const SKIP_PREFIXES = [
    "prerequisites:",
    "prerequisites",
    "prerequisite",
    "table of contents",
  ];

  try {
    const md = await fetchText(path, signal);
    if (gen !== _previewGeneration) return;
    if (!previewEl.classList.contains("visible")) return;
    let extract = "";

    // Search whole doc for TLDR section
    const tldrMatch = md.match(/##\s*TL;?DR\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
    if (tldrMatch && tldrMatch[1].trim()) {
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
              t.length > 20 &&
              !t.startsWith("#") &&
              !SKIP_PREFIXES.some((s) => t.startsWith(s))
            );
          })
          ?.trim() || "";
    }

    if (!extract) throw new Error("Empty");
    if (extract.length > 350) extract = extract.slice(0, 350) + "...";

    const rawHtml = mdConverter.makeHtml(extract);
    previewEl.innerHTML =
      typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml;

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
    previewEl.innerHTML =
      '<p style="color:var(--text-muted)">Preview not available.</p>';
  }
}

/* ═══════════════════════════════════════════════════════════════
   BREADCRUMB HELPER
   ═══════════════════════════════════════════════════════════════ */
function setBreadcrumb(elId, items) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = "";
  items.forEach((item, i) => {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "breadcrumb-sep";
      sep.textContent = "›";
      el.appendChild(sep);
    }
    const isLast = i === items.length - 1;
    if (isLast || !item.href) {
      const span = document.createElement("span");
      span.textContent = item.label;
      el.appendChild(span);
    } else {
      const a = document.createElement("a");
      a.className = "breadcrumb-link";
      a.href = item.href;
      a.textContent = item.label;
      el.appendChild(a);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */
async function fetchText(path, signal) {
  let res;
  try {
    res = await fetch(
      new URL(path, location.href).href,
      signal ? { signal } : {}
    );
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error(`Network error — check your connection (${err.message})`);
  }
  if (res.status === 404) throw new Error("Page not found (404)");
  if (res.status === 403) throw new Error("Access denied (403)");
  if (res.status >= 500) throw new Error(`Server unavailable (${res.status})`);
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  return res.text();
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
        const doc = new DOMParser().parseFromString(
          clean,
          "image/svg+xml"
        );
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
    })
  );
}

/* ─── Loading skeleton ─── */
function buildLoadingSkeleton(fingerprint) {
  const line = (w) => `<div class="skeleton-line" style="width:${w}"></div>`;
  const para = () =>
    `<div class="skeleton-para">${line("100%")}${line("96%")}${line(
      "88%"
    )}${line("60%")}</div>`;

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

function dirOf(filePath) {
  return filePath.substring(0, filePath.lastIndexOf("/"));
}

/* ─── Dynamic Page Title ─── */
function updatePageTitle(title) {
  document.title = `${title} | Wiki App`;
}

/* ─── Robust Relative Path Resolver ─── */
function resolvePath(baseDir, relHref) {
  const hashIdx = relHref.indexOf("#");
  const fragment = hashIdx >= 0 ? relHref.slice(hashIdx) : "";
  const pathPart = hashIdx >= 0 ? relHref.slice(0, hashIdx) : relHref;

  const stack = [];
  for (const p of baseDir.split("/")) if (p) stack.push(p);
  for (const p of pathPart.split("/")) {
    if (p === "..") {
      if (stack.length) stack.pop();
    } else if (p && p !== ".") stack.push(p);
  }
  return stack.join("/") + fragment;
}

/* ═══════════════════════════════════════════════════════════════
   RELATED ARTICLES
   ═══════════════════════════════════════════════════════════════ */
async function renderRelatedArticles(wiki, currentPath) {
  const container = document.getElementById("related-articles");
  if (!container) return;
  container.innerHTML = "";

  try {
    const sections = await fetchWikiIndex(wiki);
    let related = [];
    let sectionName = "";

    for (const section of sections) {
      const idx = section.cards.findIndex(
        (c) => normalizePath(c.path) === currentPath
      );
      if (idx !== -1) {
        sectionName = section.heading;
        related = section.cards
          .filter((c) => c.path !== currentPath)
          .slice(0, 3);
        break;
      }
    }

    if (!related.length) return;

    container.innerHTML = `
      <div class="related-header">
        <span class="related-label">More in ${escHtml(sectionName)}</span>
      </div>
      <div class="related-grid">
        ${related
          .map(
            (card) => `
          <div class="related-card"
               onclick="navigateToContent('${wiki.id}','${encodeURIComponent(
              card.path
            )}','${encodeURIComponent(card.title)}','${card.slug}')"
               role="button" tabindex="0"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
            <span class="related-card-title">${escHtml(card.title)}</span>
            <span class="related-card-arrow">→</span>
          </div>`
          )
          .join("")}
      </div>`;
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════ */
const _toastQueue = [];
let _toastBusy = false;

function _drainToastQueue() {
  if (_toastBusy || !_toastQueue.length) return;
  _toastBusy = true;
  const { message, durationMs, onUndo, actionLabel } = _toastQueue.shift();
  _showToastNow(message, durationMs, onUndo, actionLabel);
}

function _showToastNow(message, durationMs, onUndo, actionLabel = "Undo") {
  let toast = document.getElementById("wiki-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "wiki-toast";
    toast.className = "wiki-toast";
    document.body.appendChild(toast);
  }

  const advance = () => {
    toast.classList.remove("visible");
    setTimeout(() => {
      _toastBusy = false;
      _drainToastQueue();
    }, 200);
  };

  if (onUndo) {
    toast.replaceChildren();
    const text = document.createElement("span");
    text.textContent = message;
    const btn = document.createElement("button");
    btn.className = "toast-undo-btn";
    btn.textContent = actionLabel;
    btn.addEventListener("click", () => {
      clearTimeout(toast._timer);
      onUndo();
      advance();
    });
    toast.appendChild(text);
    toast.appendChild(btn);
  } else {
    toast.textContent = message;
  }

  toast.classList.add("visible");
  toast._timer = setTimeout(advance, durationMs);
}

function showToast(message, durationMs = 3000, onUndo = null, actionLabel = "Undo") {
  _toastQueue.push({ message, durationMs, onUndo, actionLabel });
  _drainToastQueue();
}

export {
  normalizePath,
  progressBar,
  showToast,
  showView,
  navigate,
  route,
  resolveSlugAndRender,
  renderHome,
  renderIndex,
  renderIndexSections,
  readingTime,
  populateIndexReadTimes,
  fetchWikiIndex,
  updateArticleCounts,
  parseIndexMd,
  navigateToContent,
  renderContent,
  interceptMdLinks,
  showHoverPreview,
  setBreadcrumb,
  fetchText,
  dirOf,
  updatePageTitle,
  resolvePath,
  renderRelatedArticles,
  toggleSection,
  IndexFilter,
};
