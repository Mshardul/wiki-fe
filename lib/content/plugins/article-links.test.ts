import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../pipeline";
import type { RenderContext } from "../types";

const ctx = (): RenderContext => ({
  articlePath: "content/dsa/patterns/sliding-window.md",
  verticalId: "dsa",
  allArticlePaths: new Set(),
  glossary: {},
});

describe("rehypeArticleLinks (through the pipeline)", () => {
  it("rewrites a relative .md link to a real basePath route", async () => {
    const { html } = await renderMarkdown("See [Array](../data-structures/array.md).", ctx());
    expect(html).toContain('href="/wiki-fe/dsa/data-structures/array/"');
    expect(html).toContain("wiki-link-article");
    expect(html).toContain('data-internal-link="dsa/data-structures/array"');
  });

  it("carries a fragment as ?a=", async () => {
    const { html } = await renderMarkdown(
      "See [Two Pointers](./two-pointers.md#how-it-works).",
      ctx(),
    );
    expect(html).toContain('href="/wiki-fe/dsa/patterns/two-pointers/?a=how-it-works"');
  });

  it("marks an external link target/rel", async () => {
    const { html } = await renderMarkdown("See [ext](https://example.com).", ctx());
    expect(html).toMatch(/target="_blank"/);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("wiki-link-external");
  });

  it("leaves a bare #anchor for the runtime island", async () => {
    const { html } = await renderMarkdown("[jump](#recognition-signals)", ctx());
    expect(html).toContain('href="#recognition-signals"');
    expect(html).toContain("wiki-link-inpage");
  });
});
