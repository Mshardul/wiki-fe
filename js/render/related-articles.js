import { WIKIS, escHtml } from "../state.js";
import { chipStatusHtml, isCompleted } from "../storage/completions.js";
import { fetchWikiIndex } from "./home-parse.js";
import {
  dirOf,
  fetchPrebuiltBacklinks,
  fetchPrebuiltBridges,
  normalizePath,
  resolvePath,
} from "./nav-utils.js";

/* ═══════════════════════════════════════════════════════════════
   RELATED ARTICLES
   ═══════════════════════════════════════════════════════════════ */
function _rankRelated(current, candidates) {
  const STOP = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "in",
    "to",
    "for",
    "with",
    "on",
    "at",
    "by",
    "from",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "that",
    "this",
    "it",
    "its",
  ]);
  function keywords(text) {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !STOP.has(w));
  }
  const srcKeys = new Set([...keywords(current.title), ...keywords(current.description || "")]);
  if (!srcKeys.size) return candidates.slice(0, 3);

  const scored = candidates.map((c) => {
    const cKeys = [...keywords(c.title), ...keywords(c.description || "")];
    const titleKeys = new Set(keywords(c.title));
    let score = 0;
    for (const k of cKeys) {
      if (srcKeys.has(k)) score += titleKeys.has(k) ? 3 : 1;
    }
    return { card: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored
    .filter((s) => s.score > 0)
    .slice(0, 3)
    .map((s) => s.card);
  return top.length ? top : candidates.slice(0, 3);
}

function _cardHtml({ wikiId, path, title, slug, wikiTitle, extraClass = "", completed = false }) {
  const slugArg = slug != null && slug !== "" ? `,'${slug}'` : "";
  const classes = ["related-card", extraClass].filter(Boolean).join(" ");
  const indicator = chipStatusHtml(completed);
  const inner = wikiTitle
    ? `<span class="related-card-body">
            <span class="bridge-card-wiki">${escHtml(wikiTitle)}</span>
            <span class="related-card-title">${escHtml(title)}</span>
          </span>`
    : `<span class="related-card-title">${escHtml(title)}</span>`;
  return `
          <div class="${classes}"
               onclick="navigateToContent('${wikiId}','${encodeURIComponent(
                 path,
               )}','${encodeURIComponent(title)}'${slugArg})"
               role="button" tabindex="0"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
            ${indicator}
            ${inner}
          </div>`;
}

function _stripHtml(labelHtml, cards) {
  return `
    <div class="related-header">
      <span class="related-label">${labelHtml}</span>
    </div>
    <div class="related-grid">
      ${cards.map(_cardHtml).join("")}
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   AUTHOR-CURATED "## Recommended" SECTION
   ═══════════════════════════════════════════════════════════════ */
// Author "## Recommended" heading + linked list overrides keyword-ranked auto-suggestions; heading/list stripped from rendered body so it isn't shown twice.
function extractRecommendedLinks(body, currentFilePath) {
  const section = [...body.querySelectorAll(".section")].find((s) => {
    const h2 = s.querySelector(":scope > .section-title > h2");
    return h2?.textContent.trim().toLowerCase() === "recommended";
  });
  if (!section) return null;

  const baseDir = dirOf(currentFilePath);
  const links = [];
  section.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || !href.split("#")[0].endsWith(".md")) return;
    const path = normalizePath(resolvePath(baseDir, href).split("#")[0]);
    const title = a.textContent.trim();
    if (path && title) links.push({ path, title });
  });

  section.remove();
  return links;
}

async function renderRelatedArticles(wiki, currentPath, recommendedLinks, isStale) {
  const container = document.getElementById("related-articles");
  if (!container) return;
  container.innerHTML = "";

  try {
    if (recommendedLinks?.length) {
      if (isStale?.()) return;
      container.innerHTML = _stripHtml(
        "Recommended",
        recommendedLinks.map((link) => ({
          wikiId: wiki.id,
          path: link.path,
          title: link.title,
          completed: isCompleted(normalizePath(link.path), wiki.id),
        })),
      );
      return;
    }

    const sections = await fetchWikiIndex(wiki);
    let related = [];
    let sectionName = "";

    let currentCard = null;
    for (const section of sections) {
      const idx = section.cards.findIndex((c) => normalizePath(c.path) === currentPath);
      if (idx !== -1) {
        sectionName = section.heading;
        currentCard = section.cards[idx];
        const siblings = section.cards.filter((c) => c.path !== currentPath);
        related = _rankRelated(currentCard, siblings);
        break;
      }
    }

    if (!related.length) return;
    if (isStale?.()) return;

    container.innerHTML = _stripHtml(
      `More in ${escHtml(sectionName)}`,
      related.map((card) => ({
        wikiId: wiki.id,
        path: card.path,
        title: card.title,
        slug: card.slug,
        completed: isCompleted(normalizePath(card.path), wiki.id),
      })),
    );
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════
   BACKLINK SPINE: "Mentioned by" reverse links
   ═══════════════════════════════════════════════════════════════ */
// backlinks.json is built at deploy time (build_backlinks.py); doesn't reflect same-session edits.
function _wikiIdForPath(path) {
  const wiki = WIKIS.find((w) => path.startsWith(`./content/${w.id}/`));
  return wiki?.id;
}

async function renderBacklinks(currentPath, isStale) {
  const container = document.getElementById("backlink-spine");
  if (!container) return;
  container.innerHTML = "";

  const backlinks = await fetchPrebuiltBacklinks();
  if (!backlinks) return;
  if (isStale?.()) return;
  // backlinks.json keys carry the "./content/..." prefix; currentPath is normalized, so both sides must go through normalizePath to compare.
  const entry = Object.entries(backlinks).find(([target]) => normalizePath(target) === currentPath);
  const sources = entry?.[1];
  if (!sources?.length) return;

  const cards = sources.flatMap((src) => {
    const wikiId = _wikiIdForPath(src.path);
    if (!wikiId) return [];
    return [
      {
        wikiId,
        path: src.path,
        title: src.title,
        completed: isCompleted(normalizePath(src.path), wikiId),
      },
    ];
  });
  if (!cards.length) return;

  container.innerHTML = _stripHtml("Mentioned by", cards);
}

/* ═══════════════════════════════════════════════════════════════
   CROSS-WIKI CONCEPT BRIDGES
   ═══════════════════════════════════════════════════════════════ */
// bridges.json is a hand-authored one-directional { a, b } path list, expanded symmetrically and resolved against each wiki's search index for a canonical title/slug.
function _cardForPath(sections, path) {
  for (const section of sections) {
    const card = section.cards.find((c) => normalizePath(c.path) === normalizePath(path));
    if (card) return card;
  }
  return null;
}

async function renderBridges(currentPath, isStale) {
  const container = document.getElementById("bridge-block");
  if (!container) return;
  container.innerHTML = "";

  const bridges = await fetchPrebuiltBridges();
  if (!bridges?.length) return;

  const otherPaths = [];
  for (const pair of bridges) {
    if (normalizePath(pair.a) === currentPath) otherPaths.push(pair.b);
    else if (normalizePath(pair.b) === currentPath) otherPaths.push(pair.a);
  }
  if (!otherPaths.length) return;

  const prebuiltIndex = await Promise.all(WIKIS.map((w) => fetchWikiIndex(w)));
  if (isStale?.()) return;
  const resolved = otherPaths
    .map((path) => {
      const wikiIdx = WIKIS.findIndex((w) => path.startsWith(`./content/${w.id}/`));
      if (wikiIdx === -1) return null;
      const wiki = WIKIS[wikiIdx];
      const card = _cardForPath(prebuiltIndex[wikiIdx], path);
      if (!card) return null;
      return {
        wikiId: wiki.id,
        wikiTitle: wiki.title,
        path: card.path,
        title: card.title,
        slug: card.slug,
        extraClass: "bridge-card",
        completed: isCompleted(normalizePath(card.path), wiki.id),
      };
    })
    .filter(Boolean);
  if (!resolved.length) return;

  container.innerHTML = _stripHtml("Cross-wiki bridge", resolved);
}

export { extractRecommendedLinks, renderRelatedArticles, renderBacklinks, renderBridges };
