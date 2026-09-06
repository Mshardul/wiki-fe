import type { Element, ElementContent, Root, Text } from "hast";
import { visit } from "unist-util-visit";

// Faithful port of js/content/formatting.js styleCallouts: an emoji-prefixed
// blockquote becomes a .callout with a variant class; a leading "+" after the
// emoji marks it collapsed. The first line's emoji is replaced with a paired
// .callout-icon span inside a .callout-first-line wrapper.

const CALLOUT_ICONS: Record<string, [string, string]> = {
  "🎯": ["callout-interview", "🎯"],
  "⚠️": ["callout-warning", "⚠️"],
  "⚠": ["callout-warning", "⚠️"],
  "🧠": ["callout-thought", "🧠"],
  "⚖️": ["callout-decision", "⚖️"],
  "⚖": ["callout-decision", "⚖️"],
};

function textContent(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textContent).join("");
  return "";
}

function firstElementChild(node: Element, tagName: string): Element | undefined {
  return node.children.find((c): c is Element => c.type === "element" && c.tagName === tagName);
}

export function rehypeCallouts() {
  return (tree: Root): void => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "blockquote") return;
      const text = textContent(node).trim();
      const prefix = Object.keys(CALLOUT_ICONS).find((p) => text.startsWith(p));
      const variant = prefix ? CALLOUT_ICONS[prefix] : undefined;
      if (!variant) return;
      const [calloutClass, icon] = variant;
      node.properties = node.properties ?? {};
      node.properties.className = ["callout", calloutClass];

      const firstP = firstElementChild(node, "p");
      const firstChild = firstP?.children[0];
      if (!firstP || firstChild?.type !== "text") return;

      const chars = [...firstChild.value];
      const skip = chars[1] === "️" ? 2 : 1;
      let rest = chars.slice(skip).join("").trimStart();
      if (rest.startsWith("+")) {
        rest = rest.slice(1).trimStart();
        node.properties["data-collapsed"] = "true";
      }
      firstChild.value = rest;

      const iconSpan: Element = {
        type: "element",
        tagName: "span",
        properties: { className: ["callout-icon"] },
        children: [{ type: "text", value: icon } satisfies Text],
      };
      const brIdx = firstP.children.findIndex((c) => c.type === "element" && c.tagName === "br");
      const cut = brIdx === -1 ? firstP.children.length : brIdx;
      const firstLineNodes = firstP.children.slice(0, cut);
      const rest2 = firstP.children.slice(cut);
      const firstLineWrap: Element = {
        type: "element",
        tagName: "span",
        properties: { className: ["callout-first-line"] },
        children: [iconSpan, ...firstLineNodes],
      };
      firstP.children = [firstLineWrap, ...rest2];
    });
  };
}
