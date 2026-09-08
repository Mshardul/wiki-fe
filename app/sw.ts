import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const ARTICLE_RE = /\/wiki-fe\/(dsa|system-design)\/.+/;

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
