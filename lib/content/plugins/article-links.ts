import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { BASE_PATH } from "../../config";
import { resolveContentHref } from "../paths";
import type { RenderContext } from "../types";
import { verticalRegistry } from "../verticals";

// Rewrites in-body markdown links to real Next routes: a relative *.md href resolves against the
// article path to /{vertical}/{slug}/ (fragment carried as ?a=); http(s) links get target/rel;
// bare #anchors are left for the AnchorScroll island. Ported from js/render/content-view.js interceptMdLinks.

const CONTENT_RE = /^content\/([^/]+)\/(.+)\.md$/;

function toRoute(articlePath: string, href: string): string | null {
  const [pathPart, ...hashRest] = href.split("#");
  const fragment = hashRest.join("#");
  const resolved = resolveContentHref(articlePath, pathPart ?? "");
  const m = resolved.match(CONTENT_RE);
  if (!m) return null;
  const [, vertical, slug] = m;
  if (!verticalRegistry().some((v) => v.id === vertical)) return null;
  const base = `${BASE_PATH}/${vertical}/${slug}/`;
  return fragment ? `${base}?a=${encodeURIComponent(fragment)}` : base;
}

export function rehypeArticleLinks(ctx: RenderContext) {
  return (tree: Root): void => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      // autolink-heading anchors keep their bare #id
      if (node.properties?.["ariaHidden"] === "true") return;
      const href = node.properties?.href;
      if (typeof href !== "string" || !href) return;

      // prereq chips: only fix the visible href to a real route; leave data-prereq-path + classes alone
      const isPrereqChip = classList(node.properties?.className).includes("prereq-chip");

      if (!isPrereqChip && href.startsWith("#")) {
        node.properties.className = mergeClass(node.properties.className, "wiki-link-inpage");
        return;
      }
      if (!isPrereqChip && /^https?:\/\//.test(href)) {
        node.properties.className = mergeClass(node.properties.className, "wiki-link-external");
        node.properties.target = "_blank";
        node.properties.rel = ["noopener", "noreferrer"];
        return;
      }
      const route = toRoute(ctx.articlePath, href);
      if (!route) return;
      node.properties.href = route;
      if (isPrereqChip) return;
      node.properties.className = mergeClass(node.properties.className, "wiki-link-article");
      // key for previews.json — basePath- and slash-free (e.g. "dsa/patterns/two-pointers")
      node.properties["data-internal-link"] =
        route
          .split("?")[0]
          ?.slice(BASE_PATH.length)
          .replace(/^\/|\/$/g, "") ?? "";
    });
  };
}

function classList(existing: unknown): string[] {
  if (Array.isArray(existing)) return existing.map(String);
  if (typeof existing === "string") return existing.split(/\s+/).filter(Boolean);
  return [];
}

function mergeClass(existing: unknown, add: string): string[] {
  return [...classList(existing), add];
}
