import type { Manifest } from "./types";

export type Previews = Record<string, { title: string; excerpt: string }>;

export function buildPreviews(manifest: Manifest): Previews {
  const previews: Previews = {};
  for (const a of manifest.articles) {
    if (a.isStub) continue;
    previews[`${a.verticalId}/${a.slug.join("/")}`] = { title: a.title, excerpt: a.excerpt };
  }
  return previews;
}
