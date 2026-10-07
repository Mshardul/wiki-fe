import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CANONICAL_BASE } from "@/lib/config";

// IndexTopbar → Breadcrumb/AuthButton use the app-router hooks; the SSR-markup test doesn't mount the router.
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/visualizer/",
}));

import VisualizerPage, { generateMetadata, generateStaticParams } from "./visualizer/[slug]/page";
import VisualizerIndex, { metadata } from "./visualizer/page";

describe("visualizer routes", () => {
  it("static params list every built visualizer", () => {
    expect(generateStaticParams()).toEqual([{ slug: "eviction-policies" }]);
  });

  it("metadata: titles, canonicals, no-index", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "eviction-policies" }) });
    expect(meta.title).toBe("Eviction policies");
    expect(meta.alternates?.canonical).toBe(`${CANONICAL_BASE}/visualizer/eviction-policies/`);
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe("Visualizer");
    expect(metadata.alternates?.canonical).toBe(`${CANONICAL_BASE}/visualizer/`);
  });

  it("landing links to each visualizer", () => {
    const html = renderToStaticMarkup(<VisualizerIndex />);
    // trailingSlash is applied by the export config, not by next/link in unit tests.
    expect(html).toMatch(/href="\/visualizer\/eviction-policies\/?"/);
    expect(html).toContain("Eviction policies");
  });

  it("the visualizer page ships the app shell without a baked-in run", async () => {
    const page = await VisualizerPage({ params: Promise.resolve({ slug: "eviction-policies" }) });
    const html = renderToStaticMarkup(page);
    // The wrapper sizes the app to what the topbar leaves, so the page never overflows the viewport.
    expect(html).toContain('class="viz-page"');
    expect(html).toContain("viz-app--loading");
    expect(html).not.toContain("viz-strip__cell");
  });
});
