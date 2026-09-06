import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildContent } from "../lib/content/index.ts";

const BROWSER_FILES = [
  "search-index.json",
  "backlinks.json",
  "broken-links.json",
  "bridges.json",
  "previews.json",
  "complexity-tables.json",
];

await buildContent();

const from = "lib/content/generated";
const to = "public/data";
mkdirSync(to, { recursive: true });
for (const f of BROWSER_FILES) copyFileSync(join(from, f), join(to, f));
