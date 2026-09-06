import { readFileSync } from "node:fs";
import { parseIndexSections } from "./discovery";
import { extractLinks } from "./links";
import { buildSearchIndex, type SearchIndex } from "./search-index";
import type { BacklinkRef, RelatedRef } from "./types";
import { verticalRegistry } from "./verticals";

// Semantically equivalent to scripts/build_backlinks.py output (equivalence-tested).
export type Backlinks = Record<string, { title: string; path: string }[]>;

function articleTitleMap(index: SearchIndex): Map<string, string> {
  const map = new Map<string, string>();
  for (const sections of Object.values(index)) {
    for (const section of sections) {
      for (const card of section.cards) map.set(card.path, card.title);
    }
  }
  return map;
}

export function buildBacklinks(index: SearchIndex): Backlinks {
  const articles = articleTitleMap(index);
  const backlinks: Backlinks = {};

  for (const [prefixedPath, title] of articles) {
    const fsPath = prefixedPath.replace(/^\.\//, "");
    let markdown: string;
    try {
      markdown = readFileSync(fsPath, "utf8");
    } catch {
      continue;
    }
    for (const link of extractLinks(fsPath, markdown)) {
      const targetKey = `./${link.target}`;
      if (!articles.has(targetKey)) continue;
      (backlinks[targetKey] ??= []).push({ title, path: prefixedPath });
    }
  }

  const sorted: Backlinks = {};
  for (const key of Object.keys(backlinks).sort()) sorted[key] = backlinks[key]!;
  return sorted;
}

let backlinksCache: Backlinks | null = null;
function backlinksFor(): Backlinks {
  backlinksCache ??= buildBacklinks(buildSearchIndex());
  return backlinksCache;
}

export function getBacklinks(targetPath: string): BacklinkRef[] {
  const entry = backlinksFor()[`./${targetPath.replace(/^\.\//, "")}`] ?? [];
  return entry.map((src) => {
    const clean = src.path.replace(/^\.\//, "");
    const verticalId =
      verticalRegistry().find((v) => clean.startsWith(`content/${v.id}/`))?.id ?? "";
    return { fromPath: clean, fromTitle: src.title, fromVerticalId: verticalId };
  });
}

// Ports _rankRelated from js/render/related-articles.js.
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

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

interface Candidate {
  title: string;
  description: string;
  path: string;
  slug: string[];
}

function rankRelated(current: Candidate, candidates: Candidate[]): Candidate[] {
  const srcKeys = new Set([...keywords(current.title), ...keywords(current.description)]);
  if (!srcKeys.size) return candidates.slice(0, 3);

  const scored = candidates.map((c) => {
    const cKeys = [...keywords(c.title), ...keywords(c.description)];
    const titleKeys = new Set(keywords(c.title));
    let score = 0;
    for (const k of cKeys) if (srcKeys.has(k)) score += titleKeys.has(k) ? 3 : 1;
    return { card: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored
    .filter((s) => s.score > 0)
    .slice(0, 3)
    .map((s) => s.card);
  return top.length ? top : candidates.slice(0, 3);
}

export function getRelated(vertical: string, slug: string[]): RelatedRef[] {
  const wiki = verticalRegistry().find((v) => v.id === vertical);
  if (!wiki) return [];
  const dir = wiki.indexPath.replace(/\/index\.md$/, "");
  const sections = parseIndexSections(readFileSync(wiki.indexPath, "utf8"), dir);
  const wantPath = `${dir}/${slug.join("/")}.md`;

  for (const section of sections) {
    const idx = section.articles.findIndex((a) => a.path === wantPath);
    if (idx === -1) continue;
    const current = section.articles[idx]!;
    const siblings: Candidate[] = section.articles
      .filter((a) => a.path !== wantPath)
      .map((a) => ({ title: a.title, description: a.description, path: a.path, slug: a.slug }));
    return rankRelated(
      {
        title: current.title,
        description: current.description,
        path: current.path,
        slug: current.slug,
      },
      siblings,
    ).map((c) => ({ path: c.path, title: c.title, slug: c.slug }));
  }
  return [];
}
