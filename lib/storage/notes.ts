import { PREFIXES } from "./keys";
import { getString, remove, setString } from "./local";

const notesKeyFor = (wikiId: string, articlePath: string) =>
  `${PREFIXES.notes}${wikiId}-${articlePath.replace(/\//g, "-")}`;

export const Notes = {
  get(wikiId: string, articlePath: string): string {
    return getString(notesKeyFor(wikiId, articlePath)) || "";
  },
  set(wikiId: string, articlePath: string, text: string): void {
    const key = notesKeyFor(wikiId, articlePath);
    if (text.trim()) setString(key, text);
    else remove(key);
  },
};
