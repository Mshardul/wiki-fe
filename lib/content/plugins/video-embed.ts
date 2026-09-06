import type { Html, Paragraph, Root } from "mdast";
import { visit } from "unist-util-visit";

// Faithful port of js/content/video-embed.js: a paragraph that is nothing but a
// bare YouTube/Vimeo URL becomes a responsive iframe embed. A URL inside prose
// is left untouched.

const YOUTUBE_RE =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=([\w-]+)(?:&\S*)?|youtu\.be\/([\w-]+))\/?$/;
const VIMEO_RE = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)\/?$/;

function embedUrlFor(rawUrl: string): string | null {
  const url = rawUrl.trim();
  const yt = url.match(YOUTUBE_RE);
  if (yt) return `https://www.youtube.com/embed/${yt[1] ?? yt[2]}`;
  const vimeo = url.match(VIMEO_RE);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function remarkVideoEmbed() {
  return (tree: Root): void => {
    visit(tree, "paragraph", (node: Paragraph, index, parent) => {
      if (!parent || typeof index !== "number" || node.children.length !== 1) return;
      const only = node.children[0];
      let text: string | null = null;
      if (only?.type === "text") {
        text = only.value.trim();
      } else if (only?.type === "link") {
        const first = only.children[0];
        if (first?.type === "text" && first.value.trim() === only.url.trim()) {
          text = only.url.trim();
        }
      }
      if (!text || /\s/.test(text)) return;
      const src = embedUrlFor(text);
      if (!src) return;
      const html: Html = {
        type: "html",
        value:
          `<div class="video-embed"><iframe src="${src}" loading="lazy" ` +
          `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
          `allowfullscreen title="Embedded video"></iframe></div>`,
      };
      parent.children.splice(index, 1, html);
    });
  };
}
