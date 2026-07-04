import { escHtml } from "../state.js";
import { fetchWikiIndex } from "./home-index.js";
import { normalizePath } from "./nav-utils.js";

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

async function renderRelatedArticles(wiki, currentPath) {
  const container = document.getElementById("related-articles");
  if (!container) return;
  container.innerHTML = "";

  try {
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

export { renderRelatedArticles };
