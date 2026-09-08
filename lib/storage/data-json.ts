import { z } from "zod";
import { BASE_PATH } from "@/lib/config";

const glossary = z.record(z.string(), z.string());
const synonyms = z.record(z.string(), z.array(z.string()));
const shortcut = z.object({ keys: z.array(z.string()), description: z.string() });
const shortcuts = z.object({
  global: z.array(shortcut).default([]),
  content: z.array(shortcut).default([]),
});
const summaries = z.record(z.string(), z.string());

const searchCard = z.object({
  title: z.string(),
  path: z.string(),
  slug: z.string(),
  description: z.string().optional(),
});
const searchIndex = z.record(
  z.string(),
  z.array(z.object({ heading: z.string(), cards: z.array(searchCard) })),
);

const linkRef = z.object({ title: z.string(), path: z.string() });
const backlinks = z.record(z.string(), z.array(linkRef));
const previews = z.record(z.string(), z.object({ title: z.string(), excerpt: z.string() }));
const complexityTables = z.record(
  z.string(),
  z.object({
    columns: z.array(z.string()),
    rows: z.array(z.object({ operation: z.string(), values: z.record(z.string(), z.string()) })),
  }),
);

const SCHEMAS = {
  glossary,
  synonyms,
  shortcuts,
  summaries,
  "search-index": searchIndex,
  backlinks,
  previews,
  "complexity-tables": complexityTables,
} as const;

export type DataJsonName = keyof typeof SCHEMAS;
type DataJson<N extends DataJsonName> = z.infer<(typeof SCHEMAS)[N]>;

const EMPTY: { [N in DataJsonName]: DataJson<N> } = {
  glossary: {},
  synonyms: {},
  shortcuts: { global: [], content: [] },
  summaries: {},
  "search-index": {},
  backlinks: {},
  previews: {},
  "complexity-tables": {},
};

const cache = new Map<DataJsonName, Promise<unknown>>();

// Loads a public/data/<name>.json file, zod-validates it, caches the promise. Never throws — returns the empty default on any failure.
export function loadDataJson<N extends DataJsonName>(name: N): Promise<DataJson<N>> {
  const hit = cache.get(name);
  if (hit) return hit as Promise<DataJson<N>>;

  const p = (async () => {
    try {
      const res = await fetch(`${BASE_PATH}/data/${name}.json`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return EMPTY[name];
      const parsed = SCHEMAS[name].safeParse(await res.json());
      return parsed.success ? (parsed.data as DataJson<N>) : EMPTY[name];
    } catch {
      return EMPTY[name];
    }
  })();

  cache.set(name, p);
  return p;
}

export function _clearDataJsonCache(): void {
  cache.clear();
}
