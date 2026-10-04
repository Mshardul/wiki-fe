import { readdirSync } from "node:fs";
import { loadArticle } from "./article";
import { renderLoadedArticle } from "./get-article";
import type { Article } from "./types";

const CANARY_DIR = "tests/fixtures/canary";
// Canaries render as if they lived in this vertical so relative links to real articles resolve.
const CANARY_VERTICAL_DIR = "content/dsa";

export function canaryNames(): string[] {
  return readdirSync(CANARY_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export async function getCanary(name: string): Promise<Article | undefined> {
  if (!canaryNames().includes(name)) return undefined;
  const loaded = loadArticle(`${CANARY_VERTICAL_DIR}/${name}.md`, `${CANARY_DIR}/${name}.md`);
  return renderLoadedArticle(loaded);
}
