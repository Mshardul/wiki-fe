import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../pipeline";
import type { RenderContext } from "../types";

const ctx = (over: Partial<RenderContext> = {}): RenderContext => ({
  articlePath: "content/dsa/data-structures/hash-table.md",
  verticalId: "dsa",
  allArticlePaths: new Set(),
  glossary: { lru: "A cache eviction policy that discards the least recently used items first." },
  articleTitle: "Hash Table",
  verticalTitle: "Data Structures & Algorithms",
  ...over,
});

const read = (name: string) => readFileSync(`lib/content/plugins/fixtures/${name}`, "utf8");

describe("rehype-comparison-table", () => {
  const md = read("comparison-table.md");

  it("marks a Big-O table with data-comparison", async () => {
    const { html } = await renderMarkdown(md, ctx());
    const tables = html.match(/<table[^>]*>/g) ?? [];
    expect(tables[0]).toContain('data-comparison="true"');
  });

  it("marks a table under a *Comparison* heading", async () => {
    const { html } = await renderMarkdown(md, ctx());
    const tables = html.match(/<table[^>]*>/g) ?? [];
    expect(tables[1]).toContain('data-comparison="true"');
  });

  it("leaves a plain data table unmarked", async () => {
    const { html } = await renderMarkdown(md, ctx());
    const tables = html.match(/<table[^>]*>/g) ?? [];
    expect(tables[2]).not.toContain("data-comparison");
  });

  it("adds data-col-key to every header cell of a comparison table", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toContain('data-col-key="Operation"');
    expect(html).toContain('data-col-key="Average"');
    expect(html).toContain('data-col-key="Worst"');
  });

  it("flags numeric / Big-O columns", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(/data-col-key="Average"[^>]*data-col-numeric="true"/);
    expect(html).toMatch(/data-col-key="Bytes"[^>]*data-col-numeric="true"/);
  });
});

describe("rehype-code-header", () => {
  const md = read("code-header.md");

  it("wraps each pre with a code-header (traffic lights + copy placeholder)", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect((html.match(/class="code-header"/g) ?? []).length).toBe(2);
    expect(html).toContain('class="code-traffic-lights"');
    expect(html).toContain('class="copy-btn"');
  });

  it("shows the language label from the fence info string", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toContain('<span class="code-lang-label">python</span>');
    expect(html).toContain('<span class="code-lang-label">js</span>');
  });

  it("carries data-code-origin built from title and vertical", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toContain(
      'data-code-origin="Hash Table · Data Structures &#x26; Algorithms wiki"',
    );
  });

  it("adds has-line-numbers and .code-line spans on a 3+ line block only", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect((html.match(/has-line-numbers/g) ?? []).length).toBe(1);
    expect(html).toMatch(/class="line code-line"/);
  });

  it("does not touch the mermaid pre", async () => {
    const withMermaid = "# x\n\n```mermaid\nflowchart LR\n A --> B\n```\n";
    const { html } = await renderMarkdown(withMermaid, ctx());
    expect(html).toContain('<pre class="mermaid"');
    expect(html).not.toMatch(/<pre class="mermaid"[\s\S]*?code-header/);
  });
});

describe("rehype-glossary-caveat-markers", () => {
  const md = read("glossary-caveat.md");

  it("turns [?text] into a caveat marker with a hidden body", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(
      /<span class="caveat-marker" role="button" tabindex="0" aria-expanded="false"><span class="caveat-body" aria-hidden="true">assuming a good hash function<\/span><\/span>/,
    );
  });

  it("upgrades an abbr that matches a glossary key", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(
      /<abbr[^>]*class="glossary-term glossary-term--expandable"[^>]*role="button"[^>]*aria-expanded="false"/,
    );
    expect(html).toContain('<span class="glossary-inline-def" aria-hidden="true">');
  });

  it("leaves an abbr with no glossary entry alone", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(/<abbr title="Not in glossary">XYZ<\/abbr>/);
  });
});
