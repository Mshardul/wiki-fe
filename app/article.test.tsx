import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CANONICAL_BASE } from "@/lib/config";
import { getArticle, getArticleSlugs } from "@/lib/content";

// client islands in the tree (EscapeToIndex, …) call useRouter/usePathname; the SSR-markup
// test doesn't mount the app router, so stub the hooks.
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
}));

import Article, { generateMetadata } from "./[vertical]/[...slug]/page";

describe("article route", () => {
  it("generateMetadata is reader-facing: '<title> · <vertical>', excerpt, canonical, no-index", async () => {
    const article = await getArticle("dsa", ["data-structures", "array"]);
    const meta = await generateMetadata({
      params: Promise.resolve({ vertical: "dsa", slug: ["data-structures", "array"] }),
    });
    expect(meta.title).toBe(`${article?.title} · Data Structures & Algorithms`);
    expect(meta.description).toBe(article?.excerpt || undefined);
    expect(meta.alternates?.canonical).toBe(`${CANONICAL_BASE}/dsa/data-structures/array/`);
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

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
    // Known stub — avoid getManifest()/full corpus rebuild in the unit project.
    const el = await Article({
      params: Promise.resolve({ vertical: "dsa", slug: ["patterns", "cyclic-sort"] }),
    });
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
