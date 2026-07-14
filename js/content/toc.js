import { state } from "../state.js";
import { getCollapsed, restoreTOCScroll, saveTOCScroll, toggleCollapse } from "../storage/scroll-collapse.js";

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
      chevron.innerHTML = `<svg class="icon"><use href="#icon-chevron-down"></use></svg>`;
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
      '<svg class="icon" aria-hidden="true"><use href="#icon-chevron-down"></use></svg>';
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

// reset-view escape hatch
function expandAllSections(contentEl) {
  contentEl.querySelectorAll("h2.section--collapsed").forEach((h2) => {
    const sectionId = h2.dataset.sectionId;
    _setSectionCollapsed(h2, false);
    if (sectionId) {
      const key = `wiki-heading-collapsed-${state.currentWikiId}-${state.currentFilePath?.replace(/\//g, "-")}-${h2.id}`;
      toggleCollapse(key, h2, false);
      _syncTocGroup(sectionId, false);
    }
  });
}

export {
  buildTOC,
  injectHeadingCollapseToggles,
  addStickySection,
  cleanupStickySection,
  initProgressRingScrollTop,
  updateProgressRing,
  expandAllSections,
};
