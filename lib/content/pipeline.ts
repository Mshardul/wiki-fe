import rehypeShiki from "@shikijs/rehype";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { type Processor, unified } from "unified";
import { rehypeArticleLinks } from "./plugins/article-links";
import { rehypeCallouts } from "./plugins/callouts";
import { rehypeCodeHeader } from "./plugins/code-header";
import { rehypeComparisonTable } from "./plugins/comparison-table";
import { rehypeGlossaryCaveatMarkers } from "./plugins/glossary-caveat-markers";
import { remarkStripInContentToc } from "./plugins/in-content-toc";
import { remarkMermaid } from "./plugins/mermaid";
import { rehypePracticeAnswer } from "./plugins/practice-answer";
import { rehypePrerequisites } from "./plugins/prerequisites";
import { rehypeSectionWrap } from "./plugins/section-wrap";
import { remarkTabbedCode } from "./plugins/tabbed-code";
import { remarkVideoEmbed } from "./plugins/video-embed";
import { remarkViz } from "./plugins/viz";
import { headingText } from "./toc";
import type { RenderContext } from "./types";

// Explicit list — @shikijs/rehype defaults to every bundled language (~13s cold start).
// mermaid/viz fences are consumed by remark plugins before Shiki; `text` is a Shiki special language, always available for fallbackLanguage.
export const SHIKI_LANGS = [
  "python",
  "javascript",
  "json",
  "sql",
  "shellscript",
  "lua",
  "diff",
  "java",
] as const;

// Order matters: section-wrap must run before prerequisites/practice-answer (they target .section-body/.subsection-body), code-header must run after Shiki (it wraps the highlighted output).
export function createProcessor(ctx: RenderContext): Processor {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkStripInContentToc)
    .use(remarkMermaid)
    .use(remarkVideoEmbed)
    .use(remarkViz)
    .use(remarkTabbedCode)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSectionWrap)
    .use(rehypeKatex)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: (node) => ({
        className: ["anchor-btn"],
        ariaLabel: `Link to ${headingText(node)}`,
      }),
      content: {
        type: "element",
        tagName: "svg",
        properties: { className: ["icon"], ariaHidden: "true" },
        children: [
          { type: "element", tagName: "use", properties: { href: "#icon-anchor" }, children: [] },
        ],
      },
    })
    .use(rehypeCallouts)
    .use(rehypePrerequisites, ctx)
    .use(rehypePracticeAnswer)
    .use(rehypeComparisonTable)
    .use(rehypeArticleLinks, ctx)
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark" },
      langs: [...SHIKI_LANGS],
      fallbackLanguage: "text",
      addLanguageClass: true,
    })
    .use(rehypeCodeHeader, ctx)
    .use(rehypeGlossaryCaveatMarkers, ctx)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .freeze() as unknown as Processor;
}

export async function renderMarkdown(md: string, ctx: RenderContext): Promise<{ html: string }> {
  const file = await createProcessor(ctx).process(md);
  return { html: String(file) };
}
