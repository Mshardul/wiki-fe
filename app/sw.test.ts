import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sw = readFileSync("app/sw.ts", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");
const config = readFileSync("serwist.config.js", "utf8");

describe("service worker precache scope (spec §8: small shell, not the whole site)", () => {
  it("precaches only the injected __SW_MANIFEST, never hard-coded article paths", () => {
    expect(sw).toContain("precacheEntries: self.__SW_MANIFEST");
    expect(sw).not.toMatch(/precacheEntries:\s*\[/);
    expect(sw).not.toMatch(/["'`]\/wiki-fe\/(dsa|system-design)\/[a-z]/);
  });

  it("runtime-caches article pages under both verticals", () => {
    expect(sw).toMatch(/dsa\|system-design/);
    expect(sw).toContain("wiki-articles");
    expect(sw).toContain("StaleWhileRevalidate");
  });

  it("falls back to the offline route for uncached document navigations", () => {
    expect(sw).toContain("/wiki-fe/offline/");
    expect(sw).toContain('request.destination === "document"');
  });

  it("config globs the shell, not article HTML", () => {
    expect(config).toContain('"index.html"');
    expect(config).toContain('"dsa/index.html"');
    expect(config).not.toMatch(/"dsa\/\*\*"/);
    expect(config).not.toMatch(/"\*\*\/\*\.html"/);
    expect(config).toContain('modifyURLPrefix: { "": "/wiki-fe/" }');
  });

  it("precaches only the shell's own chunks, runtime-caches the rest", () => {
    // config derives globPatterns from the shell HTML instead of a blanket _next/static/**/*.js
    expect(config).not.toMatch(/"_next\/static\/\*\*\/\*\.\{js/);
    expect(config).toContain("SHELL_HTML");
    expect(config).toContain("shellAssets");
    // sw.ts runtime-caches every other JS chunk
    expect(sw).toContain("wiki-static");
    expect(sw).toMatch(/_next\\\/static\\\/.+\\\.js/);
  });

  it("runtime-caches visualizer pages so they work offline after one visit", () => {
    expect(sw).toContain("visualizer\\/");
  });

  it("registers the worker in production builds only, since next dev never emits sw.js", () => {
    expect(layout).toMatch(
      /NODE_ENV === "production" && \(?\s*<script dangerouslySetInnerHTML=\{\{ __html: swRegister \}\} \/>/,
    );
  });
});
