import { fromHtml } from "hast-util-from-html";
import { describe, expect, it } from "vitest";
import { extractHeadings } from "./toc";

function hast(html: string) {
  return fromHtml(html, { fragment: true });
}

describe("extractHeadings", () => {
  it("returns h2/h3/h4 in document order with depth, text, id", () => {
    const tree = hast(
      '<h1 id="t">T</h1><h2 id="a">Alpha</h2><h3 id="b">Beta</h3><h4 id="c">Gamma</h4><h2 id="d">Delta</h2>',
    );
    expect(extractHeadings(tree)).toEqual([
      { depth: 2, text: "Alpha", id: "a" },
      { depth: 3, text: "Beta", id: "b" },
      { depth: 4, text: "Gamma", id: "c" },
      { depth: 2, text: "Delta", id: "d" },
    ]);
  });

  it("excludes the H1", () => {
    const tree = hast('<h1 id="t">Title</h1><h2 id="a">Section</h2>');
    const texts = extractHeadings(tree).map((h) => h.text);
    expect(texts).toEqual(["Section"]);
  });

  it("strips the appended autolink anchor text from the heading text", () => {
    const tree = hast(
      '<h2 id="a">Real Text<a aria-hidden="true" tabindex="-1" href="#a"><span class="icon icon-link"></span></a></h2>',
    );
    expect(extractHeadings(tree)[0]).toEqual({ depth: 2, text: "Real Text", id: "a" });
  });

  it("finds headings nested inside section-wrap containers", () => {
    const tree = hast(
      '<div class="section"><div class="section-title"><h2 id="a">Nested</h2></div><div class="section-body"><p>x</p></div></div>',
    );
    expect(extractHeadings(tree)).toEqual([{ depth: 2, text: "Nested", id: "a" }]);
  });
});
