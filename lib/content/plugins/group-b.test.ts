import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../pipeline";
import type { RenderContext } from "../types";

const ctx: RenderContext = {
  articlePath: "content/dsa/patterns/sliding-window.md",
  verticalId: "dsa",
  allArticlePaths: new Set(),
  glossary: {},
};

const read = (name: string) => readFileSync(`lib/content/plugins/fixtures/${name}`, "utf8");

describe("remark-mermaid", () => {
  const md = read("mermaid.md");

  it('turns each mermaid fence into <pre class="mermaid"> with the raw source', async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect((html.match(/<pre class="mermaid"/g) ?? []).length).toBe(2);
    expect(html).toContain('data-mermaid-src="flowchart LR');
    expect(html).toContain("sequenceDiagram");
  });

  it("does not run the mermaid block through Shiki", async () => {
    const { html } = await renderMarkdown(md, ctx);
    const preBlocks = html.match(/<pre class="mermaid"[\s\S]*?<\/pre>/g) ?? [];
    expect(preBlocks).toHaveLength(2);
    for (const block of preBlocks) expect(block).not.toContain("shiki");
  });

  it("leaves a non-mermaid code block for Shiki", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toMatch(/<pre[^>]*shiki/);
  });
});

describe("remark-video-embed", () => {
  const md = read("video.md");

  it("embeds a bare YouTube watch URL", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain(
      '<div class="video-embed"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"',
    );
  });

  it("embeds a bare youtu.be URL", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain('src="https://www.youtube.com/embed/abc123XYZ_-"');
  });

  it("embeds a bare Vimeo URL", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain('src="https://player.vimeo.com/video/123456789"');
  });

  it("leaves a URL inside a sentence as a link", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toMatch(/See this video at <a[^>]*youtu\.be\/inline123/);
    expect(html).not.toContain("embed/inline123");
  });
});

describe("remark-viz", () => {
  const md = read("viz.md");

  it("renders a valid bst block as inline svg in a .structure-viz wrapper", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toMatch(/<div class="structure-viz" data-viz-type="bst"><svg/);
  });

  it("renders a valid array block", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toContain('data-viz-type="array"');
  });

  it("leaves a malformed block as a code fallback", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toMatch(/<pre[\s\S]*?not valid json[\s\S]*?<\/pre>/);
  });
});

describe("remark-tabbed-code", () => {
  const md = read("tabbed-code.md");

  it("wraps a multi-pre tab group in a .tabbed-code with id and title", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).toMatch(/<div class="tabbed-code" data-tabs-id="ex1" data-tabs-title="Two ways">/);
  });

  it("strips the id= marker line from each code block", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).not.toContain("// id=");
    expect(html).not.toContain("# id=");
    expect(html).not.toMatch(/>#?\s*id="ex1"/);
  });

  it("leaves a single-pre tab group ungrouped", async () => {
    const { html } = await renderMarkdown(md, ctx);
    expect(html).not.toContain('data-tabs-id="solo"');
  });
});
