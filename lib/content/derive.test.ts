import { fromHtml } from "hast-util-from-html";
import { describe, expect, it } from "vitest";
import { readingTimeMinutes } from "./article";
import { computeShapeFingerprint, deriveExcerpt } from "./derive";

function hast(html: string) {
  return fromHtml(html, { fragment: true });
}

describe("computeShapeFingerprint", () => {
  it("counts h2/h3/h4 as headings, pre as codeBlocks, table, p", () => {
    const tree = hast(
      "<h1>t</h1><h2>a</h2><h3>b</h3><h4>c</h4><p>one</p><p>two</p><pre>x</pre><table><tr><td>1</td></tr></table>",
    );
    expect(computeShapeFingerprint(tree)).toEqual({
      headings: 3,
      codeBlocks: 1,
      tables: 1,
      paragraphs: 2,
    });
  });

  it("has the headings and codeBlocks fields js/render/content-view.js reads", () => {
    const fp = computeShapeFingerprint(hast("<h2>a</h2><pre>x</pre>"));
    expect(fp).toHaveProperty("headings");
    expect(fp).toHaveProperty("codeBlocks");
  });
});

describe("deriveExcerpt", () => {
  it("returns the first non-empty paragraph as plain text", () => {
    const tree = hast("<h2>Heading</h2><p></p><p>The <em>real</em> first paragraph here.</p>");
    expect(deriveExcerpt(tree)).toBe("The real first paragraph here.");
  });

  it("trims to about 200 characters", () => {
    const long = "word ".repeat(100).trim();
    const tree = hast(`<p>${long}</p>`);
    expect(deriveExcerpt(tree).length).toBeLessThanOrEqual(201);
  });

  it("returns an empty string when there is no paragraph", () => {
    expect(deriveExcerpt(hast("<h2>only a heading</h2>"))).toBe("");
  });
});

describe("readingTimeMinutes (Phase 5 assertions)", () => {
  it("returns 0 for a stub", () => {
    expect(readingTimeMinutes("plenty of words ".repeat(50), true)).toBe(0);
  });
  it("returns a plausible minute count for a long article", () => {
    const text = "word ".repeat(1000);
    expect(readingTimeMinutes(text, false)).toBe(5);
  });
});
