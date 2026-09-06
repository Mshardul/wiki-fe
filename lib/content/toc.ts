import type { Element, Nodes } from "hast";
import { visit } from "unist-util-visit";
import type { Heading } from "./types";

const HEADING_DEPTH: Record<string, 2 | 3 | 4> = { h2: 2, h3: 3, h4: 4 };

// Excludes the appended rehype-autolink anchor text.
function headingText(node: Element): string {
  let out = "";
  visit(node, "text", (t, _i, parent) => {
    const p = parent && parent.type === "element" ? parent : undefined;
    if (p?.tagName === "a" && p.properties?.["ariaHidden"] === "true") return;
    out += t.value;
  });
  return out.trim();
}

// h2/h3/h4 in document order, matching js/content/toc.js buildTOC.
export function extractHeadings(tree: Nodes): Heading[] {
  const headings: Heading[] = [];
  visit(tree, "element", (node: Element) => {
    const depth = HEADING_DEPTH[node.tagName];
    if (!depth) return;
    const id = typeof node.properties?.["id"] === "string" ? node.properties["id"] : "";
    headings.push({ depth, text: headingText(node), id });
  });
  return headings;
}
