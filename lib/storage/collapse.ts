import { getString, remove, setString } from "./local";

// Ported from js/storage/scroll-collapse.js — heading-collapse persistence, keyed per wiki + article + section.
const slugBase = (articlePath: string) => articlePath.replace(/\//g, "-");

export function collapseKey(wikiId: string, articlePath: string, sectionId: string): string {
  return `wiki-heading-collapsed-${wikiId}-${slugBase(articlePath)}-${sectionId}`;
}

export function isCollapsed(key: string): boolean {
  return !!getString(key);
}

export function setCollapsed(key: string, collapsed: boolean): void {
  if (collapsed) setString(key, "1");
  else remove(key);
}

// Prune keys for sections whose id no longer exists (renderer id changed/removed).
export function gcCollapseKeys(wikiId: string, articlePath: string, liveIds: string[]): void {
  const prefix = `wiki-heading-collapsed-${wikiId}-${slugBase(articlePath)}-`;
  const live = new Set(liveIds);
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix) && !live.has(key.slice(prefix.length))) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }
}
