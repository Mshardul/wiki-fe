import { WIKIS, escHtml } from "../state.js";
import { fetchWikiIndex } from "./home-index.js";
import { dirOf, fetchPrebuiltBacklinks, normalizePath, resolvePath } from "./nav-utils.js";

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

/* ─── Author-curated "## Recommended" section ───
   Authors can end an article with a `## Recommended` heading followed by a
   list of internal markdown links. When present, this takes over the related
   panel instead of the keyword-ranked auto-suggestions, and the raw heading +
   list is removed from the rendered body so it isn't shown twice. */
function extractRecommendedLinks(body, currentFilePath) {
  const heading = [...body.querySelectorAll("h2")].find(
    (h) => h.textContent.trim().toLowerCase() === "recommended",
  );
  if (!heading) return null;

  const baseDir = dirOf(currentFilePath);
  const links = [];
  const toRemove = [heading];
  let node = heading.nextElementSibling;
  while (node && node.tagName !== "H2") {
    toRemove.push(node);
    node.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || !href.split("#")[0].endsWith(".md")) return;
      const path = normalizePath(resolvePath(baseDir, href).split("#")[0]);
      const title = a.textContent.trim();
      if (path && title) links.push({ path, title });
    });
    node = node.nextElementSibling;
  }

  toRemove.forEach((el) => el.remove());
  return links;
}

async function renderRelatedArticles(wiki, currentPath, recommendedLinks) {
  const container = document.getElementById("related-articles");
  if (!container) return;
  container.innerHTML = "";

  try {
    if (recommendedLinks?.length) {
      container.innerHTML = `
        <div class="related-header">
          <span class="related-label">Recommended</span>
        </div>
        <div class="related-grid">
          ${recommendedLinks
            .map(
              (link) => `
            <div class="related-card"
                 onclick="navigateToContent('${wiki.id}','${encodeURIComponent(
                   link.path,
                 )}','${encodeURIComponent(link.title)}')"
                 role="button" tabindex="0"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
              <span class="related-card-title">${escHtml(link.title)}</span>
              <span class="related-card-arrow">→</span>
            </div>`,
            )
            .join("")}
        </div>`;
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
                 card.path,
               )}','${encodeURIComponent(card.title)}','${card.slug}')"
               role="button" tabindex="0"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
            <span class="related-card-title">${escHtml(card.title)}</span>
            <span class="related-card-arrow">→</span>
          </div>`,
          )
          .join("")}
      </div>`;
  } catch {}
}

/* ─── Backlink spine: "Mentioned by" reverse links (WIKI-250) ───
   Built at deploy time (build_backlinks.py) from every article's internal
   .md links, inverted into target -> [source articles]. Static per deploy -
   only reflects content as of the last commit, not same-session edits. */
function _wikiIdForPath(path) {
  const wiki = WIKIS.find((w) => path.startsWith(`./content/${w.id}/`));
  return wiki?.id;
}

async function renderBacklinks(currentPath) {
  const container = document.getElementById("backlink-spine");
  if (!container) return;
  container.innerHTML = "";

  const backlinks = await fetchPrebuiltBacklinks();
  if (!backlinks) return;
  // Keys/paths in backlinks.json carry the "./content/..." prefix used by
  // search-index.json; currentPath and interceptMdLinks hrefs are normalized
  // (no leading "./"), so both sides must go through normalizePath to compare.
  const entry = Object.entries(backlinks).find(([target]) => normalizePath(target) === currentPath);
  const sources = entry?.[1];
  if (!sources?.length) return;

  container.innerHTML = `
    <div class="related-header">
      <span class="related-label">Mentioned by</span>
    </div>
    <div class="related-grid">
      ${sources
        .map((src) => {
          const wikiId = _wikiIdForPath(src.path);
          if (!wikiId) return "";
          return `
          <div class="related-card"
               onclick="navigateToContent('${wikiId}','${encodeURIComponent(
                 src.path,
               )}','${encodeURIComponent(src.title)}')"
               role="button" tabindex="0"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
            <span class="related-card-title">${escHtml(src.title)}</span>
            <span class="related-card-arrow">→</span>
          </div>`;
        })
        .join("")}
    </div>`;
}

export { extractRecommendedLinks, renderRelatedArticles, renderBacklinks };
