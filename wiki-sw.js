const SHELL_CACHE = "wiki-shell-v18";
const ARTICLE_CACHE = "wiki-articles-v6fd7a4e8";

// Served for an uncached article request while offline; plain markdown (not HTML) so it renders through the normal content pipeline.
const OFFLINE_FALLBACK_MD = `# You're offline

This article hasn't been downloaded for offline reading.

Reconnect, or open **Settings → Offline** to save articles ahead of time.
`;

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Minimal boot shell — CSS/JS beyond app.js+state.js are runtime-cached on first fetch via the handler below, not precached.
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

  // Markdown files: article cache if downloaded, else network, else (offline+uncached) a static fallback instead of a failed fetch.
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
