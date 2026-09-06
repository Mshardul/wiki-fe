import { readFileSync } from "node:fs";
import matter from "gray-matter";
import type { Link, List, Root } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { READING_WPM, STUB_THRESHOLD } from "./constants";
import type { Prerequisite } from "./types";
import { verticalRegistry } from "./verticals";

// `- [Title](rel.md) [Must read]` / `[Should read]`; brackets without a following "(" are not a link.
const PREREQ_LEVEL_RE = /\[(Must|Should) read\]/;

export interface LoadedArticle {
  path: string;
  slug: string[];
  verticalId: string;
  title: string;
  prerequisites: Prerequisite[];
  byteSize: number;
  isStub: boolean;
  markdown: string;
}

function parseMdast(md: string): Root {
  return unified().use(remarkParse).parse(md);
}

function firstH1(tree: Root): string | null {
  let found: string | null = null;
  visit(tree, "heading", (node) => {
    if (found === null && node.depth === 1) {
      found = mdToString(node).trim();
    }
  });
  return found;
}

function humanizeFilename(path: string): string {
  const base = path.split("/").pop()?.replace(/\.md$/, "") ?? path;
  return base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function verticalDirFor(verticalId: string): string {
  const v = verticalRegistry().find((x) => x.id === verticalId);
  return v ? v.indexPath.replace(/\/index\.md$/, "") : `content/${verticalId}`;
}

function slugFor(path: string, verticalId: string): string[] {
  const dir = verticalDirFor(verticalId);
  const rest = path.startsWith(`${dir}/`) ? path.slice(dir.length + 1) : path;
  const parts = rest.split("/");
  const last = parts.pop();
  if (last) parts.push(last.replace(/\.md$/, ""));
  return parts;
}

function resolveHref(fromPath: string, href: string): string {
  const fromDir = fromPath.split("/").slice(0, -1).join("/");
  const clean = href.split("#")[0] ?? href;
  const parts = `${fromDir}/${clean}`.split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "." || p === "") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}

function extractPrerequisites(tree: Root, fromPath: string): Prerequisite[] {
  let prereqList: List | null = null;
  const children = tree.children;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (
      node &&
      node.type === "heading" &&
      node.depth === 2 &&
      mdToString(node).trim() === "Prerequisites"
    ) {
      for (let j = i + 1; j < children.length; j++) {
        const next = children[j];
        if (!next) continue;
        if (next.type === "heading") break;
        if (next.type === "list") {
          prereqList = next;
          break;
        }
      }
      break;
    }
  }
  if (!prereqList) return [];

  const out: Prerequisite[] = [];
  for (const item of prereqList.children) {
    const text = mdToString(item);
    const levelMatch = PREREQ_LEVEL_RE.exec(text);
    const level: "Must" | "Should" | null =
      levelMatch?.[1] === "Must" ? "Must" : levelMatch?.[1] === "Should" ? "Should" : null;

    let link: Link | undefined;
    visit(item, "link", (node) => {
      link ??= node;
    });

    let title: string;
    let href: string | null = null;
    if (link) {
      title = mdToString(link).trim();
      href =
        link.url.endsWith(".md") || link.url.includes(".md#")
          ? resolveHref(fromPath, link.url)
          : link.url;
    } else {
      title = text.replace(PREREQ_LEVEL_RE, "").trim();
    }
    out.push({ title, href, level });
  }
  return out;
}

export function loadArticle(path: string): LoadedArticle {
  const raw = readFileSync(path, "utf8");
  const { content } = matter(raw);
  const tree = parseMdast(content);

  const verticalId = path.replace(/^content\//, "").split("/")[0] ?? "";
  const byteSize = Buffer.byteLength(raw);
  const isStub = byteSize < STUB_THRESHOLD;
  const title = firstH1(tree) ?? humanizeFilename(path);

  return {
    path,
    slug: slugFor(path, verticalId),
    verticalId,
    title,
    prerequisites: extractPrerequisites(tree, path),
    byteSize,
    isStub,
    markdown: content,
  };
}

export function readingTimeMinutes(markdown: string, isStub: boolean): number {
  if (isStub) return 0;
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / READING_WPM));
}
