import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";
import { resolveContentHref } from "../paths";
import type { RenderContext } from "../types";

// Faithful port of js/content/formatting.js renderPrerequisites: the "Prerequisites"
// H2 + its UL become a .prereqs-container of chips right after the H1. Completion
// state (chip-status--done, sort-by-done) needs runtime wiki-be data, so this emits
// data-prereq-path and an undecorated .chip-status for the cutover.md island to fill.

const PREREQ_LEVEL_RE = /\[(Must|Should) read\]/;

function hasClass(node: ElementContent, cls: string): node is Element {
  if (node.type !== "element") return false;
  const cn = node.properties?.className;
  return Array.isArray(cn) && cn.includes(cls);
}

function text(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(text).join("");
  return "";
}

function findDescendant(node: Element, tagName: string): Element | undefined {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    if (child.tagName === tagName) return child;
    const nested = findDescendant(child, tagName);
    if (nested) return nested;
  }
  return undefined;
}

function chipFor(li: Element, ctx: RenderContext): Element {
  const link = findDescendant(li, "a");
  const strong = findDescendant(li, "strong");
  const levelMatch = text(li).match(PREREQ_LEVEL_RE);
  const level = levelMatch ? levelMatch[1] : null;
  const rawHref = link?.properties?.href;
  const href = typeof rawHref === "string" ? rawHref : undefined;
  const cleanTitle = text(link ?? strong ?? li).trim();

  const status: Element = {
    type: "element",
    tagName: "span",
    properties: { className: ["chip-status"], "aria-hidden": "true" },
    children: [],
  };
  const children: ElementContent[] = [status, { type: "text", value: cleanTitle }];
  if (level) {
    children.push({
      type: "element",
      tagName: "span",
      properties: { className: ["prereq-level", `prereq-level--${level.toLowerCase()}`] },
      children: [{ type: "text", value: level }],
    });
  }

  if (link && href) {
    return {
      type: "element",
      tagName: "a",
      properties: {
        className: ["prereq-chip"],
        href,
        "data-title": cleanTitle,
        "data-prereq-path": resolveContentHref(ctx.articlePath, href),
      },
      children,
    };
  }
  return {
    type: "element",
    tagName: "span",
    properties: {
      className: ["prereq-chip", "prereq-chip--unlinked"],
      "data-unlinked-prereq": "true",
      "data-title": cleanTitle,
    },
    children,
  };
}

export function rehypePrerequisites(ctx: RenderContext) {
  return (tree: Root): void => {
    let containerNode: Element | undefined;
    let sectionIndex = -1;

    visit(tree, "element", (section: Element, index, parent) => {
      if (containerNode || !hasClass(section, "section") || parent?.type !== "root") return;
      const title = section.children.find((c) => hasClass(c, "section-title"));
      const heading =
        title?.type === "element"
          ? title.children.find((c): c is Element => c.type === "element" && c.tagName === "h2")
          : undefined;
      if (!heading || text(heading).trim() !== "Prerequisites") return;
      const body = section.children.find((c) => hasClass(c, "section-body"));
      const list =
        body?.type === "element"
          ? body.children.find((c): c is Element => c.type === "element" && c.tagName === "ul")
          : undefined;
      if (!list) return;
      const items = list.children.filter(
        (c): c is Element => c.type === "element" && c.tagName === "li",
      );
      if (!items.length) return;

      containerNode = {
        type: "element",
        tagName: "div",
        properties: { className: ["prereqs-container"] },
        children: [
          {
            type: "element",
            tagName: "span",
            properties: { className: ["prereqs-label"] },
            children: [{ type: "text", value: "Prerequisites:" }],
          },
          ...items.map((li) => chipFor(li, ctx)),
        ],
      };
      sectionIndex = typeof index === "number" ? index : -1;
    });

    if (!containerNode || sectionIndex === -1) return;
    tree.children.splice(sectionIndex, 1);
    const h1Index = tree.children.findIndex((c) => c.type === "element" && c.tagName === "h1");
    tree.children.splice(h1Index + 1, 0, containerNode);
  };
}
