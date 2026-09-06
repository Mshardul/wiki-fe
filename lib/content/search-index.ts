import { readFileSync } from "node:fs";
import { verticalRegistry } from "./verticals";

// Output shape and parsing rules must stay in step with scripts/build_search_index.py (equivalence-tested).
const SKIP_HEADINGS = ["how to use", "contributing"];
const ROW_RE = /^\|\s*\[([^\]]+)\]\(([^)]+\.md)\)\s*\|\s*([^|]+?)\s*\|/;

export interface SearchCard {
  title: string;
  path: string;
  slug: string;
  description: string;
}
export interface SearchSection {
  heading: string;
  cards: SearchCard[];
}
export type SearchIndex = Record<string, SearchSection[]>;

function parseIndexMd(markdown: string, basePath: string): SearchSection[] {
  const sections: SearchSection[] = [];
  const normalized = markdown.replace(/\r\n/g, "\n");
  const chunks = normalized.split(/\n(?=## )/);

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const firstLine = lines[0] ?? "";
    if (!firstLine.startsWith("## ")) continue;

    const heading = firstLine.slice(3).trim();
    if (SKIP_HEADINGS.some((s) => heading.toLowerCase().includes(s))) continue;

    const cards: SearchCard[] = [];
    for (const line of lines) {
      if (!line.startsWith("|")) continue;
      if (/^\|\s*[-:]+/.test(line)) continue;
      const m = ROW_RE.exec(line);
      if (!m) continue;
      const title = m[1]!.trim();
      const relPath = m[2]!.trim();
      const description = m[3]!.trim();
      const fullPath = `${basePath}/${relPath.replace(/^\.\//, "")}`;
      const slug = relPath.split("/").at(-1)!.replace(/\.md$/, "");
      cards.push({ title, path: fullPath, slug, description });
    }

    if (cards.length) sections.push({ heading, cards });
  }
  return sections;
}

export function buildSearchIndex(): SearchIndex {
  const index: SearchIndex = {};
  for (const wiki of verticalRegistry()) {
    const markdown = readFileSync(wiki.indexPath, "utf8");
    index[wiki.id] = parseIndexMd(markdown, `./content/${wiki.id}`);
  }
  return index;
}
