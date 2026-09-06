import type { Element, Nodes } from "hast";
import { visit } from "unist-util-visit";
import type { ShapeFingerprint } from "./types";

function textContent(node: Element): string {
  let out = "";
  visit(node, "text", (t) => {
    out += t.value;
  });
  return out;
}

const EXCERPT_MAX = 200;

// headings/codeBlocks match js/render/content-view.js saveShapeFingerprint; tables/paragraphs are additive.
export function computeShapeFingerprint(tree: Nodes): ShapeFingerprint {
  const fp: ShapeFingerprint = { headings: 0, codeBlocks: 0, tables: 0, paragraphs: 0 };
  visit(tree, "element", (node: Element) => {
    switch (node.tagName) {
      case "h2":
      case "h3":
      case "h4":
        fp.headings++;
        break;
      case "pre":
        fp.codeBlocks++;
        break;
      case "table":
        fp.tables++;
        break;
      case "p":
        fp.paragraphs++;
        break;
    }
  });
  return fp;
}

export function deriveExcerpt(tree: Nodes): string {
  let excerpt = "";
  visit(tree, "element", (node: Element) => {
    if (excerpt || node.tagName !== "p") return;
    const text = textContent(node).replace(/\s+/g, " ").trim();
    if (text) excerpt = text;
  });
  if (excerpt.length <= EXCERPT_MAX) return excerpt;
  const clipped = excerpt.slice(0, EXCERPT_MAX);
  const lastSpace = clipped.lastIndexOf(" ");
  return (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd();
}
