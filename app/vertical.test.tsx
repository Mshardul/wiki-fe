import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CANONICAL_BASE } from "@/lib/config";

// IndexTopbar → Breadcrumb/AuthButton use the app-router hooks; the SSR-markup test
// doesn't mount the router.
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dsa/",
}));

import VerticalIndex, { generateMetadata, generateStaticParams } from "./[vertical]/page";

describe("vertical index route", () => {
  it("generateMetadata: vertical title, description, canonical, no-index", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ vertical: "dsa" }) });
    expect(meta.title).toBe("Data Structures & Algorithms");
    expect(meta.alternates?.canonical).toBe(`${CANONICAL_BASE}/dsa/`);
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("generateStaticParams yields both verticals", () => {
    expect(
      generateStaticParams()
        .map((p) => p.vertical)
        .sort(),
    ).toEqual(["dsa", "system-design"]);
  });

  it("renders sections with article links", async () => {
    const el = await VerticalIndex({ params: Promise.resolve({ vertical: "dsa" }) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain('class="index-main"');
    expect(html).toContain('class="index-section"');
    expect(html).toMatch(/href="\/dsa\/[^"]+"/);
  });

  it("rejects an unknown vertical", async () => {
    await expect(
      VerticalIndex({ params: Promise.resolve({ vertical: "nope" }) }),
    ).rejects.toThrow();
  });
});
