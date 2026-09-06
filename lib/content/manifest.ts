import { readFileSync } from "node:fs";
import { getArticle, getArticleSlugs } from "./get-article";
import { manifestSchema } from "./manifest.schema";
import type { Article, Manifest, ManifestArticle, Vertical } from "./types";
import { verticalRegistry } from "./verticals";

function stripHtml(article: Article): ManifestArticle {
  const rest: Partial<Article> = { ...article };
  delete rest.html;
  return rest as ManifestArticle;
}

const GENERATED_PATH = "lib/content/generated/manifest.json";

let builtParts: { verticals: Vertical[]; articles: ManifestArticle[] } | null = null;

// articleCount is the total index.md count incl. stubs, matching js/render/home-parse.js updateArticleCounts.
export async function buildManifest(): Promise<Manifest> {
  if (!builtParts) {
    const articles: ManifestArticle[] = [];
    for (const { vertical, slug } of getArticleSlugs()) {
      const article = await getArticle(vertical, slug);
      if (!article) continue;
      articles.push(stripHtml(article));
    }
    const verticals: Vertical[] = verticalRegistry().map((v) => ({
      ...v,
      articleCount: articles.filter((a) => a.verticalId === v.id).length,
    }));
    builtParts = { verticals, articles };
  }
  return {
    generatedAt: new Date().toISOString(),
    verticals: builtParts.verticals,
    articles: builtParts.articles,
  };
}

let manifestCache: Manifest | null = null;

function readGeneratedManifest(): Manifest | null {
  try {
    return manifestSchema.parse(JSON.parse(readFileSync(GENERATED_PATH, "utf8")));
  } catch {
    return null;
  }
}

export async function getManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache;
  manifestCache = readGeneratedManifest() ?? (await buildManifest());
  return manifestCache;
}

// Emitted file only, null before the first content build.
export function getManifestSync(): Manifest | null {
  manifestCache ??= readGeneratedManifest();
  return manifestCache;
}

export { GENERATED_PATH };
