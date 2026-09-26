import { readFileSync } from "node:fs";

// Turbopack chunk filenames are content-hashed and non-deterministic across builds, so the
// shell's JS/CSS can't be matched by a static glob. Scan the four entry HTML pages for the
// _next/static assets they actually reference and precache exactly those. Every other chunk
// (route-specific islands, the lazy reader libs like mermaid/katex, ~3 MB) is runtime-cached
// in app/sw.ts — fetched from network on first use, served from cache on repeat/offline.
const SHELL_HTML = [
  "out/index.html",
  "out/dsa/index.html",
  "out/system-design/index.html",
  "out/offline/index.html",
];

const shellAssets = new Set();
for (const file of SHELL_HTML) {
  const html = readFileSync(file, "utf8");
  for (const m of html.matchAll(/_next\/static\/[^"']+?\.(?:js|css|woff2?)/g)) {
    shellAssets.add(m[0]);
  }
}

/** @type {import("@serwist/cli").BuildOptions} */
export default {
  swSrc: "app/sw.ts",
  swDest: "out/sw.js",
  globDirectory: "out",
  globPatterns: [
    ...shellAssets,
    "_next/static/media/**",
    "index.html",
    "dsa/index.html",
    "system-design/index.html",
    "offline/index.html",
    "manifest.webmanifest",
    "icon.svg",
    "icons/**/*.{png,svg}",
  ],
  // out/ is served under /wiki-fe/ on GitHub Pages; precache keys must match
  modifyURLPrefix: { "": "/wiki-fe/" },
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
};
