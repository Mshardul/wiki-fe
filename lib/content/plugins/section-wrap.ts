import type { Element, ElementContent, Root } from "hast";
import { h } from "hastscript";

// Faithful port of js/content/section-wrap.js: wraps flat heading-siblings into
// nested .section / .subsection containers so later plugins and islands can target
// "everything under this heading" by element instead of re-walking siblings.

type Depth = "h2" | "h3";

function isHeading(node: ElementContent | undefined, tags: Set<string>): node is Element {
  return node?.type === "element" && tags.has(node.tagName);
}

function wrapRuns(
  children: ElementContent[],
  headingTag: Depth,
  stopTags: Set<string>,
  titleClass: string,
  bodyClass: string,
  wrapperClass: string,
): ElementContent[] {
  const out: ElementContent[] = [];
  const headingSet = new Set([headingTag]);
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (!node) continue;
    if (!isHeading(node, headingSet)) {
      out.push(node);
      continue;
    }
    const body: ElementContent[] = [];
    let j = i + 1;
    for (; j < children.length; j++) {
      const next = children[j];
      if (!next) continue;
      if (isHeading(next, stopTags)) break;
      body.push(next);
    }
    out.push(
      h(`div.${wrapperClass}`, [h(`div.${titleClass}`, [node]), h(`div.${bodyClass}`, body)]),
    );
    i = j - 1;
  }
  return out;
}

export function rehypeSectionWrap() {
  return (tree: Root): void => {
    const wrapped = wrapRuns(
      tree.children as ElementContent[],
      "h2",
      new Set(["h1", "h2"]),
      "section-title",
      "section-body",
      "section",
    );
    for (const node of wrapped) {
      if (node.type !== "element") continue;
      const cls = node.properties?.className;
      if (!Array.isArray(cls) || !cls.includes("section")) continue;
      const bodyDiv = node.children.find(
        (c): c is Element =>
          c.type === "element" &&
          Array.isArray(c.properties?.className) &&
          c.properties.className.includes("section-body"),
      );
      if (!bodyDiv) continue;
      bodyDiv.children = wrapRuns(
        bodyDiv.children,
        "h3",
        new Set(["h1", "h2", "h3"]),
        "subsection-title",
        "subsection-body",
        "subsection",
      );
    }
    tree.children = wrapped;
  };
}
