import { PREFIXES } from "./keys";
import { getString, setString } from "./local";

const slugBase = (articlePath: string) => articlePath.replace(/\//g, "-");

function scrollKey(wikiId: string, articlePath: string): string {
  return `${PREFIXES.tocScroll}article-${wikiId}-${slugBase(articlePath)}`;
}

export function saveScrollPosition(wikiId: string, articlePath: string, y: number): void {
  setString(scrollKey(wikiId, articlePath), String(Math.round(y)));
}

export function restoreScrollPosition(wikiId: string, articlePath: string): number {
  return Number.parseInt(getString(scrollKey(wikiId, articlePath)) ?? "0", 10) || 0;
}
