import { WIKIS, fuzzyMatch, state } from "../state.js";
import { renderContent } from "./content-view.js";
import { parseIndexMd, renderHome, renderIndex } from "./home-index.js";
import { dirOf, fetchText, updatePageTitle } from "./nav-utils.js";
import { showToast } from "./toast.js";

/* ═══════════════════════════════════════════════════════════════
   VIEW MANAGEMENT
   ═══════════════════════════════════════════════════════════════ */
const progressBar = document.getElementById("reading-progress");

function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
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
        `No "${slug}" - did you mean ${suggestion.title}?`,
        8000,
        () => navigate(`${wiki.id}/${suggestion.slug}`),
        "Open",
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

export { progressBar, showView, navigate, route, resolveSlugAndRender, nearestSlugMatch };
