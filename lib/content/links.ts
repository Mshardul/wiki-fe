import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";

const LINK_RE = /\[[^\]]*\]\(([^)#]+\.md)(#[^)]*)?\)/g;

export interface RawLink {
  href: string;
  fragment: string | null;
  target: string;
}

export interface LinkError {
  fromPath: string;
  href: string;
  target: string;
  reason: "missing-target" | "missing-anchor";
  anchor?: string;
}

export function resolveLink(baseDir: string, relHref: string): string {
  const stack = baseDir.split("/").filter(Boolean);
  for (const part of relHref.split("/")) {
    if (part === "..") stack.pop();
    else if (part && part !== ".") stack.push(part);
  }
  return stack.join("/");
}

export function scanLinks(fromPath: string, markdown: string): RawLink[] {
  const baseDir = posix.dirname(fromPath);
  const links: RawLink[] = [];
  for (const m of markdown.matchAll(LINK_RE)) {
    const href = m[1]!;
    const fragment = m[2] ? m[2].slice(1) : null;
    const target = resolveLink(baseDir, href);
    if (target === fromPath) continue;
    links.push({ href, fragment, target });
  }
  return links;
}

// Deduped by resolved target, matching the Python generators' seen_targets behaviour.
export function extractLinks(fromPath: string, markdown: string): RawLink[] {
  const seen = new Set<string>();
  return scanLinks(fromPath, markdown).filter((l) => {
    if (seen.has(l.target)) return false;
    seen.add(l.target);
    return true;
  });
}

// missing-target is a hard failure; missing-anchor is collected for the caller to log (link-anchor-discrepancies.md), not fail on.
export function validateLinks(
  articlePaths: string[],
  headingIdsByPath: Map<string, Set<string>>,
): LinkError[] {
  const known = new Set(articlePaths);
  const errors: LinkError[] = [];
  for (const fromPath of articlePaths) {
    let markdown: string;
    try {
      markdown = readFileSync(fromPath, "utf8");
    } catch {
      continue;
    }
    const reportedMissing = new Set<string>();
    const reportedAnchor = new Set<string>();
    for (const link of scanLinks(fromPath, markdown)) {
      if (!known.has(link.target)) {
        if (existsSync(link.target)) continue;
        if (reportedMissing.has(link.target)) continue;
        reportedMissing.add(link.target);
        errors.push({
          fromPath,
          href: link.href,
          target: link.target,
          reason: "missing-target",
        });
        continue;
      }
      if (link.fragment) {
        const ids = headingIdsByPath.get(link.target);
        const key = `${link.target}#${link.fragment}`;
        if (ids && !ids.has(link.fragment) && !reportedAnchor.has(key)) {
          reportedAnchor.add(key);
          errors.push({
            fromPath,
            href: link.href,
            target: link.target,
            reason: "missing-anchor",
            anchor: link.fragment,
          });
        }
      }
    }
  }
  return errors;
}
