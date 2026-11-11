import { MECHANISM_VISUALIZER, type MechanismSlug } from "./links";
import manifestJson from "./manifest.json";

export interface MechanismManifestRow {
  scenarioCount: number;
  expectReadArticle: boolean;
}

export interface MechanismManifest {
  slugs: Record<string, MechanismManifestRow>;
}

export const MECHANISM_MANIFEST = manifestJson as MechanismManifest;

const SLUG_BY_KEY = Object.fromEntries(
  (Object.entries(MECHANISM_VISUALIZER) as [MechanismSlug, string][]).map(([key, path]) => [
    path.replace(/^\/visualizer\//, "").replace(/\/$/, ""),
    key,
  ]),
) as Record<string, MechanismSlug>;

export function mechanismKeyForRouteSlug(slug: string): MechanismSlug | undefined {
  return SLUG_BY_KEY[slug];
}

export function mechanismManifestRow(slug: string): MechanismManifestRow | undefined {
  return MECHANISM_MANIFEST.slugs[slug];
}
