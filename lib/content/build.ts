import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fromHtml } from "hast-util-from-html";
import { buildBacklinks } from "./backlinks";
import { validateBridges } from "./bridges";
import { buildBrokenLinks } from "./broken-links";
import { buildComplexityTables } from "./complexity-tables";
import { getArticle, getArticleSlugs } from "./get-article";
import { validateLinks } from "./links";
import { buildManifest, GENERATED_PATH } from "./manifest";
import { manifestSchema } from "./manifest.schema";
import { buildPreviews } from "./previews";
import { buildSearchIndex } from "./search-index";
import { extractHeadings } from "./toc";

const GENERATED_DIR = dirname(GENERATED_PATH);

export interface ContentBuildPaths {
  manifest: string;
  searchIndex: string;
  backlinks: string;
  brokenLinks: string;
  bridges: string;
  previews: string;
  complexityTables: string;
}

function writeJson(name: string, data: unknown): void {
  writeFileSync(join(GENERATED_DIR, name), `${JSON.stringify(data, null, 2)}\n`);
}

export async function buildContent(): Promise<ContentBuildPaths> {
  mkdirSync(GENERATED_DIR, { recursive: true });

  const slugs = getArticleSlugs();
  const headingIdsByPath = new Map<string, Set<string>>();
  for (const { vertical, slug } of slugs) {
    const article = await getArticle(vertical, slug);
    if (!article) continue;
    const ids = new Set(
      extractHeadings(fromHtml(article.html, { fragment: true })).map((h) => h.id),
    );
    headingIdsByPath.set(article.path, ids);
  }

  const manifest = await buildManifest();
  manifestSchema.parse(manifest);

  const searchIndex = buildSearchIndex();
  const backlinks = buildBacklinks(searchIndex);
  const brokenLinks = buildBrokenLinks(searchIndex);
  const bridges = validateBridges();
  const previews = buildPreviews(manifest);
  const complexityTables = await buildComplexityTables();

  const linkErrors = validateLinks([...headingIdsByPath.keys()], headingIdsByPath);
  const missingTargets = linkErrors.filter((e) => e.reason === "missing-target");
  const missingAnchors = linkErrors.filter((e) => e.reason === "missing-anchor");
  const bridgeErrors = bridges.errors;

  writeJson("manifest.json", manifest);
  writeJson("search-index.json", searchIndex);
  writeJson("backlinks.json", backlinks);
  writeJson("broken-links.json", brokenLinks);
  writeJson("bridges.json", bridges.bridges);
  writeJson("previews.json", previews);
  writeJson("complexity-tables.json", complexityTables);
  writeJson("anchor-discrepancies.json", missingAnchors);

  if (bridgeErrors.length) {
    throw new Error(`bridges.json invalid:\n  ${bridgeErrors.join("\n  ")}`);
  }
  if (missingTargets.length) {
    const lines = missingTargets.map((e) => `  ${e.fromPath} -> ${e.href}`);
    throw new Error(
      `content build: ${missingTargets.length} internal link(s) point at a missing file:\n${lines.join("\n")}`,
    );
  }

  return {
    manifest: join(GENERATED_DIR, "manifest.json"),
    searchIndex: join(GENERATED_DIR, "search-index.json"),
    backlinks: join(GENERATED_DIR, "backlinks.json"),
    brokenLinks: join(GENERATED_DIR, "broken-links.json"),
    bridges: join(GENERATED_DIR, "bridges.json"),
    previews: join(GENERATED_DIR, "previews.json"),
    complexityTables: join(GENERATED_DIR, "complexity-tables.json"),
  };
}

export async function runContentBuild(): Promise<string> {
  const manifest = await buildManifest();
  manifestSchema.parse(manifest);
  mkdirSync(GENERATED_DIR, { recursive: true });
  writeJson("manifest.json", manifest);
  return GENERATED_PATH;
}
