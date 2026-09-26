import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("disallows all crawlers, no sitemap", () => {
    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(r.sitemap).toBeUndefined();
  });
});
