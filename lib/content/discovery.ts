import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { verticalRegistry } from "./verticals";

// index.md format (matches js/render/home-parse.js parseIndexMd):
// `## Heading` starts a section; rows are `| [Title](./rel/path.md) | Description |`;
// headings matching skipHeadings are not article sections.
const SKIP_HEADINGS = ["how to use", "contributing", "deferred", "not yet filed"];
const ROW_RE = /^\|\s*\[([^\]]+)\]\(([^)]+\.md)\)\s*\|\s*([^|]*?)\s*\|/;

export interface IndexSection {
  heading: string;
  articles: { title: string; path: string; slug: string[]; description: string }[];
}

function resolveRelPath(rel: string, verticalDir: string): string {
  const clean = rel.replace(/^\.\//, "");
  return `${verticalDir}/${clean}`;
}

function slugFromPath(path: string, verticalDir: string): string[] {
  const rest = path.startsWith(`${verticalDir}/`) ? path.slice(verticalDir.length + 1) : path;
  const parts = rest.split("/");
  const last = parts.pop();
  if (last) parts.push(last.replace(/\.md$/, ""));
  return parts;
}

export function parseIndexSections(markdown: string, verticalDir: string): IndexSection[] {
  const sections: IndexSection[] = [];
  const normalized = markdown.replace(/\r\n/g, "\n");
  const chunks = normalized.split(/\n(?=## )/);

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const firstLine = lines[0] ?? "";
    if (!firstLine.startsWith("## ")) continue;

    const heading = firstLine.replace(/^## /, "").trim();
    if (SKIP_HEADINGS.some((s) => heading.toLowerCase().includes(s))) continue;

    const articles: IndexSection["articles"] = [];
    for (const line of lines) {
      if (!line.startsWith("|")) continue;
      if (/^\|\s*[-:]+/.test(line)) continue;
      const m = line.match(ROW_RE);
      if (!m) continue;
      const title = m[1]!.trim();
      const rel = m[2]!.trim();
      const description = (m[3] ?? "").trim();
      const path = resolveRelPath(rel, verticalDir);
      articles.push({ title, path, slug: slugFromPath(path, verticalDir), description });
    }

    if (articles.length) sections.push({ heading, articles });
  }

  return sections;
}

// Ports js/render/learning-paths.js TRACK_TABLE_ROW_RE.
const TRACK_ROW_RE = /^\|\s*[\w.]+\s*\|\s*\[([^\]]+)\]\(([^)]+\.md)\)\s*\|/;

export interface TrackRow {
  title: string;
  path: string;
}

export function parseTrackRows(markdown: string, trackDir: string): TrackRow[] {
  const rows: TrackRow[] = [];
  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const m = line.match(TRACK_ROW_RE);
    if (!m) continue;
    const rel = m[2]!.trim().replace(/#.*$/, "");
    rows.push({ title: m[1]!.trim(), path: posix.normalize(posix.join(trackDir, rel)) });
  }
  return rows;
}

export function discoverArticlePaths(verticalId: string): string[] {
  const vertical = verticalRegistry().find((v) => v.id === verticalId);
  if (!vertical) throw new Error(`unknown vertical: ${verticalId}`);
  const verticalDir = vertical.indexPath.replace(/\/index\.md$/, "");
  const sections = parseIndexSections(readFileSync(vertical.indexPath, "utf8"), verticalDir);

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const section of sections) {
    for (const a of section.articles) {
      if (seen.has(a.path)) continue;
      seen.add(a.path);
      ordered.push(a.path);
    }
  }
  return ordered;
}
