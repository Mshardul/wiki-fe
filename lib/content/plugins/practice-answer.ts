import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";

// Faithful port of js/content/practice-toggle.js: under the "Practice problems"
// H2, each problem H3's Approach-through-Complexity run is wrapped in a hidden
// .problem-answer. The reveal button is a cutover.md island; this emits markup only.

const APPROACH_RE = /^Approach[.:]?$/;
const COMPLEXITY_RE = /^Complexity[.:]?$/;

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

function labelText(el: ElementContent): string | null {
  if (el.type !== "element" || el.tagName !== "p") return null;
  const strong = el.children.find(
    (c): c is Element => c.type === "element" && c.tagName === "strong",
  );
  return strong ? text(strong).trim() : null;
}

function wrapAnswer(body: Element): void {
  const kids = body.children;
  const start = kids.findIndex((el) => APPROACH_RE.test(labelText(el) ?? ""));
  if (start === -1) return;
  let end = start;
  for (let i = start; i < kids.length; i++) {
    const kid = kids[i];
    if (kid && COMPLEXITY_RE.test(labelText(kid) ?? "")) {
      end = i;
      break;
    }
  }
  const wrapper: Element = {
    type: "element",
    tagName: "div",
    properties: { className: ["problem-answer"], hidden: true },
    children: kids.slice(start, end + 1),
  };
  body.children = [...kids.slice(0, start), wrapper, ...kids.slice(end + 1)];
}

export function rehypePracticeAnswer() {
  return (tree: Root): void => {
    visit(tree, "element", (section: Element) => {
      if (!hasClass(section, "section")) return;
      const title = section.children.find((c) => hasClass(c, "section-title"));
      const heading =
        title?.type === "element"
          ? title.children.find((c): c is Element => c.type === "element" && c.tagName === "h2")
          : undefined;
      if (
        !heading ||
        text(heading)
          .replace(/#+\s*$/, "")
          .trim() !== "Practice problems"
      )
        return;
      const sectionBody = section.children.find((c) => hasClass(c, "section-body"));
      if (sectionBody?.type !== "element") return;
      for (const sub of sectionBody.children) {
        if (!hasClass(sub, "subsection")) continue;
        const subBody = sub.children.find((c) => hasClass(c, "subsection-body"));
        if (subBody?.type === "element") wrapAnswer(subBody);
      }
    });
  };
}
