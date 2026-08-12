import { getCompletedSet } from "../storage/completions.js";
import { dirOf, fetchText, resolvePath } from "./nav-utils.js";

/* LEARNING PATHS - per-track completion progress on index cards, any wiki */
const TRACK_TABLE_ROW_RE = /^\|\s*[\w.]+\s*\|\s*\[[^\]]+\]\(([^)]+\.md)\)\s*\|/;

function extractTrackArticlePaths(markdown, trackDir) {
  const paths = [];
  for (const line of markdown.split("\n")) {
    const m = line.match(TRACK_TABLE_ROW_RE);
    if (m) paths.push(resolvePath(trackDir, m[1]));
  }
  return paths;
}

async function renderLearningPathProgress(section, wiki) {
  if (section.heading !== "Learning Paths") return;

  const cardEls = document.querySelectorAll("#index-sections .index-card");
  for (const card of section.cards) {
    const cardEl = Array.from(cardEls).find(
      (el) => el.querySelector(".index-card-read-time[data-path]")?.dataset.path === card.path,
    );
    if (!cardEl) continue;

    try {
      const trackMd = await fetchText(card.path);
      const trackDir = dirOf(card.path);
      const articlePaths = extractTrackArticlePaths(trackMd, trackDir);
      if (!articlePaths.length) continue;

      const completed = getCompletedSet(wiki.id);
      const doneCount = articlePaths.filter((p) => completed.has(p)).length;

      const meta = cardEl.querySelector(".index-card-meta");
      if (!meta || meta.querySelector(".index-card-path-progress")) continue;
      const progress = document.createElement("span");
      progress.className = "index-card-path-progress";
      progress.textContent = `${doneCount}/${articlePaths.length} completed`;
      meta.appendChild(progress);
    } catch {
      // Track markdown fetch failed - card still renders, just without a progress badge.
    }
  }
}

export { renderLearningPathProgress, extractTrackArticlePaths };
