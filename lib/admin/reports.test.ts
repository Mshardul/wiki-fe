import { describe, expect, it, vi } from "vitest";
import type { BrokenLinks } from "@/lib/content/broken-links";
import type { Manifest } from "@/lib/content/types";
import { assembleSiteHealth, flattenBrokenLinks } from "./reports";

vi.mock("@/lib/content/backlinks", () => ({
  getBacklinks: (path: string) =>
    path.includes("has-backlinks")
      ? [{ fromPath: "content/dsa/x.md", fromTitle: "X", fromVerticalId: "dsa" }]
      : [],
}));

const BROKEN: BrokenLinks = {
  "./content/system-design/orphan.md": [
    { title: "Orphan Page", target: "./content/system-design/missing.md" },
  ],
  "./content/dsa/a.md": [{ title: "A", target: "./content/dsa/gone.md" }],
};

const MANIFEST = {
  generatedAt: "",
  verticals: [],
  articles: [
    {
      path: "content/system-design/orphan.md",
      slug: ["orphan"],
      verticalId: "system-design",
      title: "Orphan Page",
      headings: [],
      prerequisites: [],
      excerpt: "",
      byteSize: 1,
      isStub: false,
      shapeFingerprint: { headings: 0, codeBlocks: 0, tables: 0, paragraphs: 0 },
      readingTimeMin: 1,
    },
    {
      path: "content/dsa/has-backlinks.md",
      slug: ["has-backlinks"],
      verticalId: "dsa",
      title: "Linked",
      headings: [],
      prerequisites: [],
      excerpt: "",
      byteSize: 1,
      isStub: false,
      shapeFingerprint: { headings: 0, codeBlocks: 0, tables: 0, paragraphs: 0 },
      readingTimeMin: 1,
    },
  ],
} satisfies Manifest;

describe("flattenBrokenLinks", () => {
  it("flattens source→links into title/target rows", () => {
    const rows = flattenBrokenLinks(BROKEN);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      title: "Orphan Page",
      target: "./content/system-design/missing.md",
    });
  });
});

describe("assembleSiteHealth", () => {
  it("includes articles with zero backlinks as orphans", () => {
    const reports = assembleSiteHealth(BROKEN, MANIFEST);
    expect(reports.brokenLinks).toHaveLength(2);
    expect(reports.orphans.map((o) => o.title)).toEqual(["Orphan Page"]);
  });
});
