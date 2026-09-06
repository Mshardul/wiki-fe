/** @type {import("@serwist/cli").BuildOptions} */
export default {
  swSrc: "app/sw.ts",
  swDest: "out/sw.js",
  globDirectory: "out",
  // shell only — article HTML is runtime-cached, data/*.json too (spec §8)
  globPatterns: [
    "_next/static/**/*.{js,css,woff,woff2}",
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
