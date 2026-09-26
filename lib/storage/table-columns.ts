import { getJSON, remove, setJSON } from "./local";

function key(wikiId: string, articlePath: string, tableId: string): string {
  return `wiki-table-cols-${wikiId}-${articlePath.replace(/\//g, "-")}-${tableId}`;
}

export function getHiddenColumns(wikiId: string, articlePath: string, tableId: string): string[] {
  const parsed = getJSON<unknown>(key(wikiId, articlePath, tableId), []);
  return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === "string") : [];
}

export function setHiddenColumns(
  wikiId: string,
  articlePath: string,
  tableId: string,
  hidden: string[],
): void {
  if (!hidden.length) remove(key(wikiId, articlePath, tableId));
  else setJSON(key(wikiId, articlePath, tableId), hidden);
}
