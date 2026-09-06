import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./pipeline";
import type { RenderContext } from "./types";

const ctx: RenderContext = {
  articlePath: "content/dsa/x.md",
  verticalId: "dsa",
  allArticlePaths: new Set(["content/dsa/x.md"]),
  glossary: {},
};

describe("standard pipeline", () => {
  it("renders GFM tables", async () => {
    const { html } = await renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |", ctx);
    expect(html).toContain("<table>");
  });

  it("renders fenced code with Shiki highlighting", async () => {
    const { html } = await renderMarkdown("```js\nconst x = 1;\n```", ctx);
    expect(html).toMatch(/<pre[^>]*class="[^"]*shiki/);
  });

  it("renders block math with KaTeX", async () => {
    const { html } = await renderMarkdown("$$\\frac{a}{b}$$", ctx);
    expect(html).toContain("katex");
  });

  it("renders inline math with KaTeX", async () => {
    const { html } = await renderMarkdown("the value $x^2$ here", ctx);
    expect(html).toContain("katex");
  });

  it("adds slug ids to headings", async () => {
    const { html } = await renderMarkdown("## Big Section", ctx);
    expect(html).toContain('id="big-section"');
  });

  it("adds an autolink anchor to headings", async () => {
    const { html } = await renderMarkdown("## Big Section", ctx);
    expect(html).toMatch(/<a[^>]+href="#big-section"/);
  });

  it("passes through literal HTML (rehype-raw)", async () => {
    const { html } = await renderMarkdown('<div class="note">hi</div>', ctx);
    expect(html).toContain('class="note"');
  });

  it("renders math nested inside a raw HTML block", async () => {
    const { html } = await renderMarkdown(
      '<div class="note">\n\ninline $x^2$ and\n\n$$\\frac{a}{b}$$\n\n</div>',
      ctx,
    );
    expect(html).toContain("katex");
    expect(html).toContain('class="note"');
  });

  it("does not choke on an unknown fence language", async () => {
    const { html } = await renderMarkdown("```wat\nsome text\n```", ctx);
    expect(html).toContain("some text");
  });
});
