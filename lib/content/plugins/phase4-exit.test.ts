import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../pipeline";
import type { RenderContext } from "../types";

const ctx: RenderContext = {
  articlePath: "content/system-design/hld/scaling.md",
  verticalId: "system-design",
  allArticlePaths: new Set(["content/system-design/components/databases.md"]),
  glossary: {},
  articleTitle: "Scaling",
  verticalTitle: "System Design",
};

const md = readFileSync("lib/content/plugins/fixtures/combined.md", "utf8");

describe("Phase 4 combined dialect", () => {
  it("emits every custom wrapper marker in one render", async () => {
    const { html } = await renderMarkdown(md, ctx);
    const markers = [
      'class="section"',
      'class="section-body"',
      'class="subsection"',
      'class="subsection-body"',
      'class="prereqs-container"',
      'class="prereq-chip"',
      "prereq-chip--unlinked",
      'class="callout callout-interview"',
      'class="callout-first-line"',
      'class="code-header"',
      "code-line",
      'data-comparison="true"',
      'data-col-key="Average"',
      'data-viz-type="array"',
      'class="problem-answer" hidden',
    ];
    for (const m of markers) expect(html, `missing ${m}`).toContain(m);
  });

  it("renders GFM footnotes without a custom plugin", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toMatch(/id="user-content-fnref-n"|data-footnote-ref/);
    expect(html).toContain('class="footnotes"');
    expect(html).toContain("A footnote definition.");
  });

  it("does not double-highlight the viz or mermaid output as code", async () => {
    const { html } = await renderMarkdown(md, ctx);
    const vizBlock = html.match(/<div class="structure-viz"[\s\S]*?<\/div>/)?.[0] ?? "";
    expect(vizBlock).not.toContain("shiki");
  });
});
