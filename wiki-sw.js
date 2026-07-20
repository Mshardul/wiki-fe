const SHELL_CACHE = "wiki-shell-v14";
const ARTICLE_CACHE = "wiki-articles-v1";

// Served for an uncached article request while offline, in place of a failed fetch.
// Plain markdown (not HTML) so it renders through the normal content pipeline.
const OFFLINE_FALLBACK_MD = `# You're offline

This article hasn't been downloaded for offline reading.

Reconnect, or open **Settings → Offline** to save articles ahead of time.
`;

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        cache
          .addAll([
            "./index.html",
            "./404.html",
            "./manifest.json",
            "./icon.svg",
            "./js/app.js",
            "./js/state.js",
          ])
          .catch(() => {}),
      ),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k !== SHELL_CACHE && k !== ARTICLE_CACHE)
              .map((k) => caches.delete(k)),
          ),
        ),
    ]),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== location.origin) return;

  // Markdown files: serve from article cache if user downloaded, else network,
  // else (offline + uncached) a static fallback instead of a failed fetch.
  if (url.pathname.endsWith(".md")) {
    e.respondWith(
      caches.open(ARTICLE_CACHE).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).catch(
              () =>
                new Response(OFFLINE_FALLBACK_MD, {
                  headers: { "Content-Type": "text/markdown" },
                }),
            ),
        ),
      ),
    );
    return;
  }

  // Shell assets: network-first, cache as fallback for offline
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request)),
  );
});
