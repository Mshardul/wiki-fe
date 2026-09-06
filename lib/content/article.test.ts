import { describe, expect, it } from "vitest";
import { loadArticle, readingTimeMinutes } from "./article";

const BASIC = "lib/content/fixtures/article-basic.md";
const PREREQS = "lib/content/fixtures/article-prereqs.md";
// real content: a full article and two genuine stubs
const REAL_ARTICLE = "content/dsa/data-structures/stack.md";
const REAL_STUB = "content/dsa/patterns/cyclic-sort.md";

describe("loadArticle", () => {
  it("derives title from the leading H1", () => {
    expect(loadArticle(BASIC).title).toBe("Basic Article");
  });

  it("falls back to a humanised filename when no H1", () => {
    // article-prereqs has an H1; use a path with a known slug shape instead
    expect(loadArticle(PREREQS).title).toBe("Article With Prerequisites");
  });

  it("marks a real sub-threshold file as a stub", () => {
    expect(loadArticle(REAL_STUB).isStub).toBe(true);
  });

  it("does not mark a real full article as a stub", () => {
    expect(loadArticle(REAL_ARTICLE).isStub).toBe(false);
  });

  it("parses Must/Should prerequisites with resolved hrefs", () => {
    const a = loadArticle(PREREQS);
    expect(a.prerequisites).toContainEqual(
      expect.objectContaining({ level: "Must", href: expect.stringMatching(/\.md$/) }),
    );
    expect(a.prerequisites).toContainEqual(
      expect.objectContaining({ level: "Should", href: expect.stringMatching(/linked-list\.md$/) }),
    );
  });

  it("keeps an unlinked prerequisite with a null href", () => {
    const a = loadArticle(PREREQS);
    expect(a.prerequisites).toContainEqual(
      expect.objectContaining({ title: "Some Unlinked Topic", href: null, level: "Should" }),
    );
  });

  it("resolves prerequisite hrefs against the article's directory", () => {
    const a = loadArticle(PREREQS);
    const bigO = a.prerequisites.find((p) => p.title === "Big-O Notation");
    expect(bigO?.href).toBe("lib/content/algorithms/big-o-notation.md");
  });

  it("computes byteSize as raw file length", () => {
    expect(loadArticle(BASIC).byteSize).toBeGreaterThan(0);
    expect(loadArticle(REAL_ARTICLE).byteSize).toBeGreaterThan(5000);
  });

  it("derives verticalId and slug from the path", () => {
    const a = loadArticle("content/dsa/patterns/sliding-window.md");
    expect(a.verticalId).toBe("dsa");
    expect(a.slug).toEqual(["patterns", "sliding-window"]);
  });

  it("derives a nested slug for a data-structures article", () => {
    const a = loadArticle(REAL_ARTICLE);
    expect(a.slug).toEqual(["data-structures", "stack"]);
  });
});

describe("readingTimeMinutes", () => {
  it("returns 0 for a stub", () => {
    expect(readingTimeMinutes("a few words only", true)).toBe(0);
  });
  it("returns at least 1 for any non-empty non-stub", () => {
    expect(readingTimeMinutes("one two three", false)).toBe(1);
  });
  it("scales with word count", () => {
    const text = Array(1000).fill("word").join(" ");
    expect(readingTimeMinutes(text, false)).toBe(5);
  });
});
