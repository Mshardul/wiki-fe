import { readFileSync } from "node:fs";
import { fromHtml } from "hast-util-from-html";
import { loadArticle, readingTimeMinutes } from "./article";
import { computeShapeFingerprint, deriveExcerpt } from "./derive";
import { discoverArticlePaths } from "./discovery";
import { renderMarkdown } from "./pipeline";
import { extractHeadings } from "./toc";
import type { Article, RenderContext } from "./types";
import { verticalRegistry } from "./verticals";

const VERTICAL_IDS = () => verticalRegistry().map((v) => v.id);

let allPathsCache: string[] | null = null;
function allArticlePaths(): string[] {
  allPathsCache ??= VERTICAL_IDS().flatMap((id) => discoverArticlePaths(id));
  return allPathsCache;
}

let glossaryCache: Record<string, string> | null = null;
function loadGlossary(): Record<string, string> {
  if (glossaryCache) return glossaryCache;
  try {
    glossaryCache = JSON.parse(readFileSync("data/glossary.json", "utf8")) as Record<
      string,
      string
    >;
  } catch {
    glossaryCache = {};
  }
  return glossaryCache;
}

// Feeds generateStaticParams.
export function getArticleSlugs(): { vertical: string; slug: string[] }[] {
  return VERTICAL_IDS().flatMap((vertical) =>
    discoverArticlePaths(vertical).map((path) => ({ vertical, slug: loadArticle(path).slug })),
  );
}

const articleCache = new Map<string, Promise<Article | undefined>>();

function resolvePath(vertical: string, slug: string[]): string | undefined {
  if (!VERTICAL_IDS().includes(vertical)) return undefined;
  const want = `content/${vertical}/${slug.join("/")}.md`;
  return allArticlePaths().includes(want) ? want : undefined;
}

async function assemble(path: string): Promise<Article | undefined> {
  const loaded = loadArticle(path);
  const vertical = verticalRegistry().find((v) => v.id === loaded.verticalId);
  const ctx: RenderContext = {
    articlePath: path,
    verticalId: loaded.verticalId,
    allArticlePaths: new Set(allArticlePaths()),
    glossary: loadGlossary(),
    articleTitle: loaded.title,
    verticalTitle: vertical?.title,
  };
  const { html } = await renderMarkdown(loaded.markdown, ctx);
  const tree = fromHtml(html, { fragment: true });
  return {
    path: loaded.path,
    slug: loaded.slug,
    verticalId: loaded.verticalId,
    title: loaded.title,
    headings: extractHeadings(tree),
    prerequisites: loaded.prerequisites,
    html,
    excerpt: deriveExcerpt(tree),
    byteSize: loaded.byteSize,
    isStub: loaded.isStub,
    shapeFingerprint: computeShapeFingerprint(tree),
    readingTimeMin: readingTimeMinutes(loaded.markdown, loaded.isStub),
  };
}

// Memoized per path. Undefined for an unknown vertical or slug.
export function getArticle(vertical: string, slug: string[]): Promise<Article | undefined> {
  const path = resolvePath(vertical, slug);
  if (!path) return Promise.resolve(undefined);
  let entry = articleCache.get(path);
  if (!entry) {
    entry = assemble(path);
    articleCache.set(path, entry);
  }
  return entry;
}
