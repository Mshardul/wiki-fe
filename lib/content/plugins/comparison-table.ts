import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";

// data-comparison/data-col-key/data-col-numeric here are a contract consumed by the sort/column-toggle/scroll-cue islands.

const COMPLEXITY_HEADER_RE = /\b(time|space|complexity|best|worst|average)\b/i;
const BIG_O_RE = /[OΘΩ]\s*\(/;
const WHOLE_CELL_NUM_RE = /^-?\d+(\.\d+)?$/;

function text(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(text).join("");
  return "";
}

function hasClass(node: ElementContent, cls: string): node is Element {
  if (node.type !== "element") return false;
  const cn = node.properties?.className;
  return Array.isArray(cn) && cn.includes(cls);
}

function descendants(node: Element, tagName: string): Element[] {
  const out: Element[] = [];
  visit(node, "element", (el: Element) => {
    if (el.tagName === tagName) out.push(el);
  });
  return out;
}

function isComplexityTable(table: Element): boolean {
  const headRow = descendants(table, "tr")[0];
  if (headRow && COMPLEXITY_HEADER_RE.test(text(headRow))) return true;
  return descendants(table, "td").some((td) => BIG_O_RE.test(text(td)));
}

function isComparisonHeading(section: Element): boolean {
  const title = section.children.find((c) => hasClass(c, "section-title"));
  if (title?.type !== "element") return false;
  const h2 = descendants(title, "h2")[0];
  return h2 ? /\bcomparison\b/i.test(text(h2).replace(/#+$/g, "")) : false;
}

function markTable(table: Element): void {
  table.properties = table.properties ?? {};
  table.properties["data-comparison"] = "true";

  const rows = descendants(table, "tr");
  const headerRow = rows[0];
  if (!headerRow) return;
  const headerCells = headerRow.children.filter(
    (c): c is Element => c.type === "element" && c.tagName === "th",
  );
  const bodyRows = rows.slice(1);

  headerCells.forEach((th, colIdx) => {
    const key = text(th).trim();
    th.properties = th.properties ?? {};
    th.properties["data-col-key"] = key;
    const cells = bodyRows
      .map(
        (r) =>
          r.children.filter((c): c is Element => c.type === "element" && c.tagName === "td")[
            colIdx
          ],
      )
      .filter((c): c is Element => Boolean(c));
    if (
      cells.length > 0 &&
      cells.every((c) => {
        const v = text(c).trim();
        return BIG_O_RE.test(v) || WHOLE_CELL_NUM_RE.test(v);
      })
    ) {
      th.properties["data-col-numeric"] = "true";
    }
  });
}

export function rehypeComparisonTable() {
  return (tree: Root): void => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "table") {
        if (isComplexityTable(node)) markTable(node);
        return;
      }
      if (!hasClass(node, "section") || !isComparisonHeading(node)) return;
      for (const table of descendants(node, "table")) markTable(table);
    });
  };
}
