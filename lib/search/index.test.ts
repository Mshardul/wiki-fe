import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _clearDataJsonCache } from "@/lib/storage/data-json";
import { _resetSearchEntriesCache, loadSearchEntries, routeFor } from "./index";

const INDEX = {
  dsa: [
    {
      heading: "Data Structures",
      cards: [
        {
          title: "Hash Table",
          path: "./content/dsa/data-structures/hash-table.md",
          slug: "hash-table",
          description: "keys to buckets",
        },
      ],
    },
  ],
  "system-design": [
    {
      heading: "Components",
      cards: [{ title: "DNS", path: "./content/system-design/components/dns.md", slug: "dns" }],
    },
  ],
};

beforeEach(() => {
  _resetSearchEntriesCache();
  _clearDataJsonCache?.();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(INDEX) }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("loadSearchEntries", () => {
  it("flattens the index into one entry per card with vertical titles", async () => {
    const entries = await loadSearchEntries();
    expect(entries).toHaveLength(2);
    const ht = entries.find((e) => e.slug === "hash-table")!;
    expect(ht.section).toBe("Data Structures");
    expect(ht.verticalTitle).toBe("Data Structures & Algorithms");
    expect(ht.path).toBe("content/dsa/data-structures/hash-table.md");
    expect(ht.description).toBe("keys to buckets");
  });

  it("routeFor builds a /vertical/slug/ path", async () => {
    const entries = await loadSearchEntries();
    expect(routeFor(entries.find((e) => e.slug === "dns")!)).toBe("/system-design/components/dns/");
  });
});
