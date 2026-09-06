import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getArticleSlugs } from "@/lib/content";
import Article from "./[vertical]/[...slug]/page";

describe("article route", () => {
  it("generateStaticParams covers every article", () => {
    const params = getArticleSlugs();
    expect(params.length).toBeGreaterThan(100);
    expect(params.every((p) => typeof p.vertical === "string" && Array.isArray(p.slug))).toBe(true);
  });

  it("renders real article HTML into .markdown-body", async () => {
    const el = await Article({
      params: Promise.resolve({ vertical: "dsa", slug: ["data-structures", "array"] }),
    });
    const html = renderToStaticMarkup(el);
    expect(html).toContain('class="markdown-body"');
    expect(html).toContain('id="how-it-works"');
    expect(html).toMatch(/<pre[^>]*class="[^"]*shiki/);
  });

  it("returns the notFound signal for an unknown slug", async () => {
    await expect(
      Article({ params: Promise.resolve({ vertical: "dsa", slug: ["nope", "nope"] }) }),
    ).rejects.toThrow();
  });
});
