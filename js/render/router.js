import { cleanupStickySection } from "../content/toc.js";
import { WIKIS, fuzzyMatch, state } from "../state.js";
import { renderChangelog } from "./changelog-view.js";
import { renderContent } from "./content-view.js";
import { fetchWikiIndex, renderHome, renderIndex } from "./home-index.js";
import { updatePageTitle } from "./nav-utils.js";
import { renderOfflineShelf } from "./offline-view.js";
import { showToast } from "./toast.js";

/* ═══════════════════════════════════════════════════════════════
   VIEW MANAGEMENT
   ═══════════════════════════════════════════════════════════════ */
const progressBar = document.getElementById("reading-progress");

const VIEW_DEPTH = {
  "view-home": 0,
  "view-index": 1,
  "view-content": 2,
  "view-changelog": 1,
  "view-offline-shelf": 1,
};
let _lastViewDepth = null; // null = no prior view this session yet (boot render)
const _reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function _applyView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  state.currentView = id.replace("view-", "");

  // Resume chip is appended to document.body, outside any .view container, so
  // it must be cleared on every view change, not just content->content
  // navigation - otherwise it (and its listeners) leak.
  if (id !== "view-content") document.getElementById("resume-chip")?.remove();

  // Sticky section header's scroll listener closes over the abandoned
  // article's headings. navigateToContent() only tears this down for
  // content->content transitions; content->home/index leaked it forever.
  if (id !== "view-content") cleanupStickySection();

  if (id !== "view-index") window.scrollTo(0, 0);

  const isContent = id === "view-content";
  progressBar.classList.toggle("visible", isContent);
  if (isContent) progressBar.style.width = "0%";
}

// Resolves once layout is safe to read (View Transitions freeze it until settled).
function showView(id) {
  const depth = VIEW_DEPTH[id] ?? 0;
  const direction =
    _lastViewDepth === null
      ? null
      : depth > _lastViewDepth
        ? "forward"
        : depth < _lastViewDepth
          ? "back"
          : null;
  _lastViewDepth = depth;

  // No transition on boot (direction===null) - nothing to animate from.
  const canUseViewTransition =
    typeof document.startViewTransition === "function" &&
    !_reducedMotion.matches &&
    direction !== null;

  if (!canUseViewTransition) {
    document.documentElement.classList.toggle("nav-forward", direction === "forward");
    document.documentElement.classList.toggle("nav-back", direction === "back");
    _applyView(id);
    return Promise.resolve();
  }

  document.documentElement.setAttribute("data-nav-direction", direction || "");
  const transition = document.startViewTransition(() => _applyView(id));
  return transition.ready.catch(() => {});
}

/* ═══════════════════════════════════════════════════════════════
   HASH ROUTER
   url scheme: wiki.html  →  wiki.html#system-design  →  wiki.html#system-design/message-queues
   ═══════════════════════════════════════════════════════════════ */
function navigate(hash, pushHistory = true) {
  if (pushHistory) {
    // Reconstruct URL with pathname only to strip away location.search query params
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
  if (wikiId === "changelog") {
    updatePageTitle("Changelog");
    renderChangelog();
    return;
  }
  if (wikiId === "offline") {
    updatePageTitle("Offline Shelf");
    renderOfflineShelf();
    return;
  }

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

  const slug = parts[1];
  const stateMatches = history.state?.hash === hash;
  const savedPath = stateMatches ? history.state?.filePath : null;
  const savedTitle = stateMatches ? history.state?.title : null;
  if (savedPath) {
    renderContent(wiki, savedPath, savedTitle || slug);
  } else {
    resolveSlugAndRender(wiki, slug);
  }
}

async function resolveSlugAndRender(wiki, slug) {
  try {
    const sections = await fetchWikiIndex(wiki);
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
        `No "${slug}" - did you mean ${suggestion.title}?`,
        8000,
        () => navigate(`${wiki.id}/${suggestion.slug}`),
        "Open",
      );
      return;
    }
  } catch {}

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

export { progressBar, showView, navigate, route, resolveSlugAndRender, nearestSlugMatch };
