import { escHtml, synonymCache } from "./state.js";
import { RecentSearches } from "./storage.js";

/* ═══════════════════════════════════════════════════════════════
   SNIPPET EXTRACTION
   ═══════════════════════════════════════════════════════════════ */

function _sentences(text) {
  return text.match(/[^.!?]+[.!?]*/g) || [text];
}

function extractSnippet(desc, query) {
  if (!desc) return null;
  const terms = expandQuery(query);
  const sentences = _sentences(desc);
  for (const term of terms) {
    const tl = term.toLowerCase();
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(tl)) {
        return _highlightSnippet(sentence.trim(), tl);
      }
    }
  }
  return _highlightSnippet(sentences[0].trim(), terms[0].toLowerCase());
}

function _highlightSnippet(sentence, term) {
  const idx = sentence.toLowerCase().indexOf(term);
  if (idx === -1) return escHtml(sentence);
  return `${escHtml(sentence.slice(0, idx))}<mark class="gsearch-highlight">${escHtml(sentence.slice(idx, idx + term.length))}</mark>${escHtml(sentence.slice(idx + term.length))}`;
}

/* ═══════════════════════════════════════════════════════════════
   SYNONYM EXPANSION
   ═══════════════════════════════════════════════════════════════ */

function expandQuery(query) {
  const ql = query.toLowerCase();
  const synonyms = synonymCache.map[ql];
  if (!synonyms) return [query];
  return [query, ...synonyms];
}

/* ═══════════════════════════════════════════════════════════════
   RECENT SEARCHES UI
   ═══════════════════════════════════════════════════════════════ */

function renderRecentSearches() {
  const recents = RecentSearches.get();
  if (!recents.length) return null;

  const chips = recents
    .slice(0, 5)
    .map((q) => {
      const qs = escHtml(JSON.stringify(q));
      return `
    <div class="gsearch-recent-chip">
      <button class="gsearch-recent-query" type="button"
        onclick="document.getElementById('gsearch-input').value=${qs};applyGlobalSearch(${qs})"
      >${escHtml(q)}</button>
      <button class="gsearch-recent-remove" type="button"
        aria-label="Remove ${escHtml(q)}"
        onclick="removeRecentSearchEntry(${qs})"
      >×</button>
    </div>`;
    })
    .join("");

  return `
    <div class="gsearch-recents">
      <div class="gsearch-group-label">Recent searches</div>
      <div class="gsearch-recents-chips">${chips}</div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   NO-RESULTS FALLBACK
   ═══════════════════════════════════════════════════════════════ */

function getFallbackSuggestions(query, entries, scoreFn) {
  const expanded = expandQuery(query);

  let didYouMean = null;
  if (expanded.length > 1) {
    for (const alt of expanded.slice(1)) {
      const hasHits = entries.some((e) => scoreFn(alt, e) > 0);
      if (hasHits) {
        didYouMean = alt;
        break;
      }
    }
  }

  const fuzzy = entries
    .map((e) => {
      const ql = query.toLowerCase();
      const title = e.title.toLowerCase();
      let score = 0;
      let qi = 0;
      for (let i = 0; i < title.length && qi < ql.length; i++) {
        if (title[i] === ql[qi]) qi++;
      }
      if (qi === ql.length) score = qi / title.length;
      return { entry: e, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.entry);

  return { fuzzy, didYouMean };
}

export { extractSnippet, expandQuery, renderRecentSearches, getFallbackSuggestions };
