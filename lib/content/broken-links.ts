import { readFileSync } from "node:fs";
import { extractLinks } from "./links";
import type { SearchIndex } from "./search-index";

// Semantically equivalent to scripts/build_broken_links.py output (equivalence-tested); title is the source article's, as the Python does.
export type BrokenLinks = Record<string, { title: string; target: string }[]>;

function articleTitleMap(index: SearchIndex): Map<string, string> {
  const map = new Map<string, string>();
  for (const sections of Object.values(index)) {
    for (const section of sections) {
      for (const card of section.cards) map.set(card.path, card.title);
    }
  }
  return map;
}

export function buildBrokenLinks(index: SearchIndex): BrokenLinks {
  const articles = articleTitleMap(index);
  const broken: BrokenLinks = {};

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
      if (articles.has(targetKey)) continue;
      (broken[prefixedPath] ??= []).push({ title, target: targetKey });
    }
  }

  const sorted: BrokenLinks = {};
  for (const key of Object.keys(broken).sort()) sorted[key] = broken[key]!;
  return sorted;
}
