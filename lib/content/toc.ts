import type { Element, Nodes } from "hast";
import { visit } from "unist-util-visit";
import type { Heading } from "./types";

const HEADING_DEPTH: Record<string, 2 | 3 | 4> = { h2: 2, h3: 3, h4: 4 };

export function headingText(node: Element): string {
  let out = "";
  visit(node, "text", (t) => {
    out += t.value;
  });
  return out.trim();
}

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
