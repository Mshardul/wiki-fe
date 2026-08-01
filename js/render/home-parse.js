import { WIKIS, indexCache, readTimeCache } from "../state.js";
import { dirOf, fetchPrebuiltSearchIndex, fetchText, normalizePath } from "./nav-utils.js";

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

      const m = line.match(/^\|\s*\[([^\]]+)\]\(([^)]+\.md)\)\s*\|\s*([^|]+?)\s*\|/);
      if (m) {
        const title = m[1].trim();
        const relPath = m[2].trim();
        const description = m[3].trim();

        const fullPath = `${basePath}/${relPath.replace(/^\.\//, "")}`;
        const slug = relPath.split("/").pop().replace(/\.md$/, "");

        cards.push({ title, path: fullPath, slug, description });
      }
    }

    if (cards.length) sections.push({ heading, cards });
  }

  return sections;
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

  const prebuilt = await fetchPrebuiltSearchIndex();
  let sections;
  if (prebuilt?.[wiki.id]) {
    sections = prebuilt[wiki.id];
  } else {
    const md = await fetchText(wiki.indexPath);
    const basePath = dirOf(wiki.indexPath);
    sections = parseIndexMd(md, basePath);
  }
  indexCache[wiki.id] = sections;
  try {
    sessionStorage.setItem(ssKey, JSON.stringify(sections));
  } catch {
    // Quota full: evict all other wiki-index-* entries then retry once
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith("wiki-index-") && k !== ssKey) sessionStorage.removeItem(k);
    }
    try {
      sessionStorage.setItem(ssKey, JSON.stringify(sections));
    } catch {}
  }
  return sections;
}

// Shared by search.js's loadAllSearchEntries and home-gestures.js's refresh path -
// the ⌘K search-cache row shape for one wiki, filtered to non-stub articles.
async function buildSearchEntriesForWiki(wiki) {
  const sections = await fetchWikiIndex(wiki);
  const entries = [];
  for (const section of sections) {
    for (const card of section.cards) {
      if (readTimeCache[normalizePath(card.path)] !== null) {
        entries.push({ wiki, section: section.heading, ...card });
      }
    }
  }
  return entries;
}

async function updateArticleCounts() {
  for (const wiki of WIKIS) {
    try {
      const sections = await fetchWikiIndex(wiki);
      const count = sections.reduce((sum, s) => sum + s.cards.length, 0);
      const el = document.querySelector(`[data-wiki-id="${wiki.id}"] .wiki-card-count`);
      if (el) el.textContent = `${count} articles`;
    } catch {}
  }
}

export { parseIndexMd, fetchWikiIndex, buildSearchEntriesForWiki, updateArticleCounts };
