import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import VerticalIndex, { generateStaticParams } from "./[vertical]/page";

describe("vertical index route", () => {
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
