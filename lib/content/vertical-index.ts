import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { parseIndexSections, parseTrackRows } from "./discovery";
import { buildManifest, getManifestSync } from "./manifest";
import type { Manifest, VerticalIndex } from "./types";
import { verticalRegistry } from "./verticals";

const LEARNING_PATHS_HEADING = "Learning Paths";

function verticalDir(id: string): string {
  const v = verticalRegistry().find((x) => x.id === id);
  if (!v) throw new Error(`unknown vertical: ${id}`);
  return v.indexPath.replace(/\/index\.md$/, "");
}

function slugForContentPath(path: string, dir: string): string[] | null {
  if (!path.startsWith(`${dir}/`)) return null;
  const parts = path.slice(dir.length + 1).split("/");
  const last = parts.pop();
  if (last) parts.push(last.replace(/\.md$/, ""));
  return parts;
}

function buildFrom(id: string, manifest: Manifest): VerticalIndex {
  const dir = verticalDir(id);
  const indexMd = readFileSync(`${dir}/index.md`, "utf8");
  const knownPaths = new Set(manifest.articles.map((a) => a.path));
  const stubByPath = new Map(manifest.articles.map((a) => [a.path, a.isStub]));

  const rawSections = parseIndexSections(indexMd, dir);

  const sections = rawSections
    .filter((s) => s.heading !== LEARNING_PATHS_HEADING)
    .map((s) => ({
      heading: s.heading,
      articles: s.articles.map((a) => ({
        title: a.title,
        slug: a.slug,
        path: a.path,
        isStub: stubByPath.get(a.path) ?? false,
      })),
    }));

  const learningPaths = (
    rawSections.find((s) => s.heading === LEARNING_PATHS_HEADING)?.articles ?? []
  ).map((trackCard) => {
    const trackDir = posix.dirname(trackCard.path);
    const trackMd = readFileSync(trackCard.path, "utf8");
    return {
      track: trackCard.title,
      rows: parseTrackRows(trackMd, trackDir).map((r) => ({
        title: r.title,
        slug: knownPaths.has(r.path) ? slugForContentPath(r.path, dir) : null,
      })),
    };
  });

  return { id, sections, learningPaths };
}

export async function getVerticalIndex(id: string): Promise<VerticalIndex> {
  return buildFrom(id, getManifestSync() ?? (await buildManifest()));
}
