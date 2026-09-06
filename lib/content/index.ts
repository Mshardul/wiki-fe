import { discoverArticlePaths } from "./discovery";
import { getManifestSync } from "./manifest";
import type { Vertical } from "./types";
import { verticalRegistry } from "./verticals";

// articleCount comes from the generated manifest when it exists; before the
// first content build it falls back to the discovered path count (same
// total-articles semantics as js/render/home-parse.js updateArticleCounts).
export function getVerticals(): Vertical[] {
  const manifest = getManifestSync();
  return verticalRegistry().map((v) => {
    const fromManifest = manifest?.verticals.find((mv) => mv.id === v.id);
    return {
      ...v,
      articleCount: fromManifest?.articleCount ?? discoverArticlePaths(v.id).length,
    };
  });
}

export function getVertical(id: string): Vertical | undefined {
  return getVerticals().find((v) => v.id === id);
}

export { buildBacklinks, getBacklinks, getRelated } from "./backlinks";
export { validateBridges } from "./bridges";
export { buildBrokenLinks } from "./broken-links";
export { buildContent } from "./build";
export { buildComplexityTables } from "./complexity-tables";
export { computeShapeFingerprint, deriveExcerpt } from "./derive";
export { getArticle, getArticleSlugs } from "./get-article";
export { validateLinks } from "./links";
export { buildManifest, getManifest } from "./manifest";
export { buildPreviews } from "./previews";
export { buildSearchIndex } from "./search-index";
export { extractHeadings } from "./toc";
export type {
  Article,
  BacklinkRef,
  Heading,
  Manifest,
  ManifestArticle,
  Prerequisite,
  RelatedRef,
  Vertical,
  VerticalIndex,
} from "./types";
export { getVerticalIndex } from "./vertical-index";
