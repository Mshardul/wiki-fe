import { describe, expect, it } from "vitest";
import { buildFilenameIndex, type FilenameHit, parseChangelog, resolveFilename } from "./changelog";
import { getManifest } from "./manifest";

const FIXTURE = `# Content Changelog

## Format

\`\`\`
## YYYY-MM-DD
\`\`\`

## 2026-07-10
- \`message-queues.md\` - expanded: "Delivery Semantics"
- \`unknown-file.md\` - new article

## 2026-07-05
- \`message-queues.md\` - new article
- General maintenance note with no file reference
`;

describe("parseChangelog", () => {
  it("groups entries by date and extracts backtick filenames", () => {
    const groups = parseChangelog(FIXTURE);
    expect(groups.map((g) => g.date)).toEqual(["2026-07-10", "2026-07-05"]);
    expect(groups[0]!.entries).toHaveLength(2);
    expect(groups[0]!.entries[0]!.filenames).toEqual(["message-queues.md"]);
    expect(groups[0]!.entries[1]!.filenames).toEqual(["unknown-file.md"]);
    expect(groups[1]!.entries[1]!.filenames).toEqual([]);
    expect(groups[1]!.entries[1]!.text).toContain("General maintenance");
  });

  it("skips the Format section and non-entry lines", () => {
    const groups = parseChangelog(FIXTURE);
    expect(groups.every((g) => /^\d{4}-\d{2}-\d{2}$/.test(g.date))).toBe(true);
  });
});

describe("resolveFilename", () => {
  it("resolves a real article basename via the manifest", async () => {
    const manifest = await getManifest();
    const index = buildFilenameIndex(manifest);
    const hit = resolveFilename("message-queues.md", index);
    expect(hit).not.toBeNull();
    expect(hit!.wikiId).toBe("system-design");
    expect(hit!.title).toMatch(/Message Queues/i);
    expect(hit!.slug.join("/")).toContain("message-queues");
  });

  it("returns null for an unknown filename", async () => {
    const manifest = await getManifest();
    const index = buildFilenameIndex(manifest);
    expect(resolveFilename("unknown-file.md", index)).toBeNull();
  });

  it("resolves a path-prefixed changelog filename by basename", async () => {
    const manifest = await getManifest();
    const index = buildFilenameIndex(manifest);
    const hit: FilenameHit | null = resolveFilename(
      "system-design/components/message-queues.md",
      index,
    );
    expect(hit?.title).toMatch(/Message Queues/i);
  });
});
