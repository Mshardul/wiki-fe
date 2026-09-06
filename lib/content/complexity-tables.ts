import { readFileSync } from "node:fs";
import type { Element, Nodes } from "hast";
import { fromHtml } from "hast-util-from-html";
import { visit } from "unist-util-visit";
import { parseIndexSections } from "./discovery";
import { getArticle } from "./get-article";
import { verticalRegistry } from "./verticals";

// isComplexityTable / extractTable port js/content/tables.js.
const COMPLEXITY_HEADER_RE = /\b(time|space|complexity|best|worst|average)\b/i;
const BIG_O_RE = /[OΘΩ]\s*\(/;
const DS_SECTION_HEADING = "Data Structures";

export interface ComplexityTable {
  columns: string[];
  rows: { operation: string; values: Record<string, string> }[];
}
export type ComplexityTables = Record<string, ComplexityTable>;

function text(node: Element | Nodes): string {
  let out = "";
  visit(node, "text", (t) => {
    out += t.value;
  });
  return out;
}

function tableCells(table: Element, tag: "th" | "td"): Element[][] {
  const rows: Element[][] = [];
  visit(table, "element", (row: Element) => {
    if (row.tagName !== "tr") return;
    const cells: Element[] = [];
    visit(row, "element", (c: Element) => {
      if (c.tagName === tag) cells.push(c);
    });
    if (cells.length) rows.push(cells);
  });
  return rows;
}

function isComplexityTable(table: Element): boolean {
  let head = "";
  visit(table, "element", (el: Element) => {
    if (!head && (el.tagName === "thead" || el.tagName === "tr")) head = text(el);
  });
  if (COMPLEXITY_HEADER_RE.test(head)) return true;
  let hasBigO = false;
  visit(table, "element", (el: Element) => {
    if (el.tagName === "td" && BIG_O_RE.test(text(el))) hasBigO = true;
  });
  return hasBigO;
}

function extractTable(tree: Nodes): ComplexityTable | null {
  let target: Element | null = null;
  visit(tree, "element", (el: Element) => {
    if (!target && el.tagName === "table" && isComplexityTable(el)) target = el;
  });
  if (!target) return null;

  const headerRows = tableCells(target, "th");
  const headerCells = headerRows[0] ?? [];
  const columns = headerCells.slice(1).map((th) => text(th).trim());
  if (!columns.length) return null;

  const rows = tableCells(target, "td")
    .filter((cells) => cells.length > 0)
    .map((cells) => {
      const operation = cells[0] ? text(cells[0]).trim() : "";
      const values: Record<string, string> = {};
      columns.forEach((col, i) => {
        values[col] = cells[i + 1] ? text(cells[i + 1]!).trim() : "";
      });
      return { operation, values };
    });

  return rows.length ? { columns, rows } : null;
}

export async function buildComplexityTables(): Promise<ComplexityTables> {
  const dsa = verticalRegistry().find((v) => v.id === "dsa");
  if (!dsa) return {};
  const dir = dsa.indexPath.replace(/\/index\.md$/, "");
  const sections = parseIndexSections(readFileSync(dsa.indexPath, "utf8"), dir);
  const dsSection = sections.find((s) => s.heading === DS_SECTION_HEADING);
  if (!dsSection) return {};

  const out: ComplexityTables = {};
  for (const article of dsSection.articles) {
    const rendered = await getArticle("dsa", article.slug);
    if (!rendered) continue;
    const table = extractTable(fromHtml(rendered.html, { fragment: true }));
    if (table) out[article.slug.join("/")] = table;
  }
  return out;
}
