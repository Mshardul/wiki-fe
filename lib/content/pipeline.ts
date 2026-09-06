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
import { rehypeCallouts } from "./plugins/callouts";
import { rehypeCodeHeader } from "./plugins/code-header";
import { rehypeComparisonTable } from "./plugins/comparison-table";
import { rehypeGlossaryCaveatMarkers } from "./plugins/glossary-caveat-markers";
import { remarkMermaid } from "./plugins/mermaid";
import { rehypePracticeAnswer } from "./plugins/practice-answer";
import { rehypePrerequisites } from "./plugins/prerequisites";
import { rehypeSectionWrap } from "./plugins/section-wrap";
import { remarkTabbedCode } from "./plugins/tabbed-code";
import { remarkVideoEmbed } from "./plugins/video-embed";
import { remarkViz } from "./plugins/viz";
import type { RenderContext } from "./types";

// Custom-plugin order mirrors js/render/content-view.js. Remark phase handles
// fenced-block / paragraph transforms before remark-rehype; rehype phase does
// section-wrap first so prerequisites and practice-answer can target
// .section-body / .subsection-body, then code-header after Shiki so it can wrap
// the highlighted output. Footnotes are left to remark-gfm's native support
// (no article uses the syntax, and GFM output is the standard).
export function createProcessor(ctx: RenderContext): Processor {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkMermaid)
    .use(remarkVideoEmbed)
    .use(remarkViz)
    .use(remarkTabbedCode)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSectionWrap)
    .use(rehypeKatex)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "append" })
    .use(rehypeCallouts)
    .use(rehypePrerequisites, ctx)
    .use(rehypePracticeAnswer)
    .use(rehypeComparisonTable)
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark" },
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
