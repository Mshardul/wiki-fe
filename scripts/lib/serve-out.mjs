/** Serves `out/` under `/wiki-fe/`, matching tests/conftest.py and GitHub Pages. */

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/**
 * @param {string} outDir absolute path to Next static export
 * @returns {Promise<{ baseUrl: string, close: () => Promise<void> }>}
 */
export function startServeOut(outDir, basePrefix = "/wiki-fe") {
  const root = resolve(outDir);

  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405);
        res.end();
        return;
      }

      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      let pathname = url.pathname;

      if (
        !pathname.endsWith("/") &&
        !extname(pathname.split("/").pop() ?? "")
      ) {
        const location = `${pathname}/${url.search}`;
        res.writeHead(308, { Location: location, "Content-Length": "0" });
        res.end();
        return;
      }

      let rel = pathname;
      if (rel.startsWith(basePrefix)) {
        rel = rel.slice(basePrefix.length) || "/";
      }

      const relPath = rel.endsWith("/") ? `${rel}index.html` : rel;
      const filePath = normalize(join(root, relPath.replace(/^\//, "")));
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }

      let target = filePath;
      if (!existsSync(target)) {
        const dirIndex = join(filePath.replace(/index\.html$/, ""), "index.html");
        if (existsSync(dirIndex)) {
          target = dirIndex;
        }
      }

      const dirCandidate = join(
        filePath.endsWith("index.html")
          ? filePath.slice(0, -"index.html".length)
          : filePath,
        "index.html",
      );
      if (!existsSync(target) && existsSync(dirCandidate)) {
        target = dirCandidate;
      }

      if (!existsSync(target) || !statSync(target).isFile()) {
        const body = readFileSync(join(root, "404.html"));
        res.writeHead(404, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": String(body.length),
        });
        res.end(body);
        return;
      }

      const ext = extname(target);
      const type = MIME[ext] ?? "application/octet-stream";
      const len = statSync(target).size;
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": String(len),
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      createReadStream(target).pipe(res);
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (
        server.address()
      );
      resolvePromise({
        baseUrl: `http://127.0.0.1:${port}${basePrefix}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}
