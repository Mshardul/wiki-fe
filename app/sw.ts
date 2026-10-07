import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const ARTICLE_RE = /\/wiki-fe\/((dsa|system-design)\/.+|visualizer\/)/;
const STATIC_JS_RE = /\/wiki-fe\/_next\/static\/.+\.js$/;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ url }) => ARTICLE_RE.test(url.pathname),
      handler: new StaleWhileRevalidate({ cacheName: "wiki-articles" }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/wiki-fe/data/"),
      handler: new StaleWhileRevalidate({ cacheName: "wiki-data" }),
    },
    {
      // JS chunks are not precached (see serwist.config.js): cache on first fetch so lazy libs (mermaid/katex) and unvisited routes work offline after one online visit.
      matcher: ({ url }) => STATIC_JS_RE.test(url.pathname),
      handler: new StaleWhileRevalidate({ cacheName: "wiki-static" }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/wiki-fe/offline/index.html",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
