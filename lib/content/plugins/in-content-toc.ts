import type { Heading, Root, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";

// The hand-authored "## Table of Contents" serves raw-file readers; the app has its own sidebar TOC, so drop the section.

const TOC_TITLE = "Table of Contents";

function isSectionBreak(node: RootContent): node is Heading {
  return node.type === "heading" && node.depth <= 2;
}

export function remarkStripInContentToc() {
  return (tree: Root): void => {
    const kids = tree.children;
    const start = kids.findIndex(
      (n) => n.type === "heading" && n.depth === 2 && mdToString(n).trim() === TOC_TITLE,
    );
    if (start === -1) return;
    let end = start + 1;
    while (end < kids.length && !isSectionBreak(kids[end] as RootContent)) end++;
    kids.splice(start, end - start);
  };
}
