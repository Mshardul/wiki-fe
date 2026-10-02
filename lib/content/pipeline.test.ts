import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderMarkdown, SHIKI_LANGS } from "./pipeline";
import type { RenderContext } from "./types";

const ctx: RenderContext = {
  articlePath: "content/dsa/x.md",
  verticalId: "dsa",
  allArticlePaths: new Set(["content/dsa/x.md"]),
  glossary: {},
};

// Fence tags remark consumes before Shiki — must not force a Shiki lang load.
const NON_SHIKI_FENCES = new Set(["mermaid", "viz"]);

describe("standard pipeline", () => {
  it("SHIKI_LANGS covers every Shiki-bound fence language in content/", () => {
    const fenceRe = /^```([a-zA-Z0-9_+#-]+)/gm;
    const seen = new Set<string>();
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".md")) {
          const src = readFileSync(path, "utf8");
          for (const m of src.matchAll(fenceRe)) seen.add(m[1]!.toLowerCase());
        }
      }
    };
    walk("content");
    const loaded = new Set<string>(SHIKI_LANGS);
    // shiki aliases: js→javascript, bash/shell→shellscript; text is a built-in special language
    loaded.add("text");
    loaded.add("js");
    loaded.add("bash");
    loaded.add("shell");
    for (const lang of seen) {
      if (NON_SHIKI_FENCES.has(lang)) continue;
      expect(loaded.has(lang), `add "${lang}" to SHIKI_LANGS (seen in content/)`).toBe(true);
    }
  });

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
