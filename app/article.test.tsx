import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getArticleSlugs, getManifest } from "@/lib/content";
import Article from "./[vertical]/[...slug]/page";

describe("article route", () => {
  it("generateStaticParams covers every article", () => {
    const params = getArticleSlugs();
    expect(params.length).toBeGreaterThan(100);
    expect(params.every((p) => typeof p.vertical === "string" && Array.isArray(p.slug))).toBe(true);
  });

  it("renders real article HTML into .markdown-body with a reading-time badge and related panels", async () => {
    const el = await Article({
      params: Promise.resolve({ vertical: "dsa", slug: ["data-structures", "array"] }),
    });
    const html = renderToStaticMarkup(el);
    expect(html).toContain('class="markdown-body"');
    expect(html).toContain('id="how-it-works"');
    expect(html).toMatch(/<pre[^>]*class="[^"]*shiki/);
    expect(html).toMatch(/class="read-time-badge">\d+ min read/);
    expect(html).toContain('id="backlink-spine"');
  });

  it("in-body markdown links are rewritten to real routes", async () => {
    const el = await Article({
      params: Promise.resolve({ vertical: "dsa", slug: ["patterns", "sliding-window"] }),
    });
    const html = renderToStaticMarkup(el);
    expect(html).toMatch(/href="\/wiki-fe\/dsa\/[^"]+\/"[^>]*class="[^"]*wiki-link-article/);
    expect(html).not.toMatch(/href="\.\.?\/[^"]*\.md"/);
  });

  it("renders a stub banner instead of an article body for a stub", async () => {
    const stub = (await getManifest()).articles.find((a) => a.isStub);
    if (!stub) return;
    const [vertical, ...slug] = stub.path
      .replace(/^\.?\/?content\//, "")
      .replace(/\.md$/, "")
      .split("/");
    const el = await Article({ params: Promise.resolve({ vertical: vertical ?? "", slug }) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("content-stub");
    expect(html).toContain("hasn&#x27;t been written yet");
    expect(html).not.toContain('id="markdown-body"');
  });

  it("returns the notFound signal for an unknown slug", async () => {
    await expect(
      Article({ params: Promise.resolve({ vertical: "dsa", slug: ["nope", "nope"] }) }),
    ).rejects.toThrow();
  });
});
