import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../pipeline";
import type { RenderContext } from "../types";

const ctx = (over: Partial<RenderContext> = {}): RenderContext => ({
  articlePath: "content/system-design/hld/load-balancer.md",
  verticalId: "system-design",
  allArticlePaths: new Set([
    "content/system-design/components/databases.md",
    "content/system-design/components/caching.md",
  ]),
  glossary: {},
  ...over,
});

const read = (name: string) => readFileSync(`lib/content/plugins/fixtures/${name}`, "utf8");

describe("remark-section-wrap", () => {
  const md = read("section-wrap.md");

  it("wraps each H2 run in a .section with a .section-body", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect((html.match(/class="section"/g) ?? []).length).toBe(2);
    expect(html).toContain('class="section-body"');
  });

  it("puts the heading inside a .section-title", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(/<div class="section-title"><h2/);
  });

  it("wraps H3 runs in a .subsection with a .subsection-body", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toContain('class="subsection"');
    expect(html).toContain('class="subsection-body"');
  });

  it("keeps the H1 and its intro paragraph outside any section", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(/<h1[^>]*>Title/);
    expect(html).toMatch(/Intro paragraph before any section\.<\/p>\s*<div class="section"/);
  });
});

describe("remark-callouts", () => {
  const md = read("callouts.md");

  it("tags each emoji blockquote with callout + variant class", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toContain('class="callout callout-interview"');
    expect(html).toContain('class="callout callout-warning"');
    expect(html).toContain('class="callout callout-thought"');
    expect(html).toContain('class="callout callout-decision"');
  });

  it("marks the +prefixed callout as collapsed", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(/class="callout callout-warning"[^>]*data-collapsed="true"/);
  });

  it("strips the leading emoji and pairs an icon span with the first line", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toContain('<span class="callout-first-line"><span class="callout-icon">');
    expect(html).not.toMatch(/<p>🎯/);
  });

  it("leaves a plain blockquote untouched", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(/<blockquote>\s*<p>Not a callout/);
  });
});

describe("remark-practice-answer", () => {
  const md = read("practice.md");

  it("wraps each Approach-through-Complexity run in a hidden .problem-answer", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect((html.match(/class="problem-answer" hidden/g) ?? []).length).toBe(2);
  });

  it("keeps the problem statement outside the answer wrapper", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(
      /find the max sum[\s\S]*?<\/p>\s*<div class="problem-answer" hidden><p><strong>Approach/,
    );
  });
});

describe("rehype-prerequisites", () => {
  const md = read("prerequisites.md");

  it("replaces the Prerequisites section with a .prereqs-container", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toContain('class="prereqs-container"');
    expect(html).toContain('<span class="prereqs-label">Prerequisites:</span>');
    expect(html).not.toMatch(/<h2[^>]*>Prerequisites<\/h2>/);
  });

  it("emits a linked chip with a resolved data-prereq-path", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(
      /<a class="prereq-chip"[^>]*data-prereq-path="content\/system-design\/components\/databases\.md"/,
    );
  });

  it("marks the unlinked prerequisite", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toMatch(/class="prereq-chip prereq-chip--unlinked"/);
    expect(html).toMatch(/data-unlinked-prereq="true"/);
  });

  it("carries the Must/Should level badge", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toContain('class="prereq-level prereq-level--must"');
    expect(html).toContain('class="prereq-level prereq-level--should"');
  });

  it("prepends a chip-status indicator without the done modifier", async () => {
    const { html } = await renderMarkdown(md, ctx());
    expect(html).toContain('<span class="chip-status" aria-hidden="true">');
    expect(html).not.toContain("chip-status--done");
  });
});
