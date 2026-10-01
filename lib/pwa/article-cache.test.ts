import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  articlePathToRoute,
  evictArticle,
  getCachedAt,
  isSaved,
  listSaved,
  saveArticle,
} from "./article-cache";

class FakeCache {
  store = new Map<string, Response>();
  put(key: string, res: Response) {
    this.store.set(key, res);
    return Promise.resolve();
  }
  match(key: string) {
    return Promise.resolve(this.store.get(key));
  }
  delete(key: string) {
    return Promise.resolve(this.store.delete(key));
  }
  keys() {
    return Promise.resolve([...this.store.keys()].map((k) => new Request(`https://x.test${k}`)));
  }
}

let caches_: Map<string, FakeCache>;
let cache: FakeCache;

beforeEach(() => {
  localStorage.clear();
  caches_ = new Map();
  const open = (name: string) => {
    let c = caches_.get(name);
    if (!c) {
      c = new FakeCache();
      caches_.set(name, c);
    }
    return Promise.resolve(c);
  };
  cache = caches_.get("wiki-articles") ?? new FakeCache();
  caches_.set("wiki-articles", cache);
  vi.stubGlobal("caches", { open: vi.fn(open) });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html></html>", { status: 200 })));
});
afterEach(() => vi.unstubAllGlobals());

describe("article-cache", () => {
  it("maps a content path to a route", () => {
    expect(articlePathToRoute("content/dsa/patterns/sliding-window.md")).toBe(
      "/wiki-fe/dsa/patterns/sliding-window/",
    );
  });

  it("save -> entry present, cachedAt recorded", async () => {
    const p = "content/dsa/patterns/sliding-window.md";
    expect(await saveArticle(p)).toBe(true);
    expect(await isSaved(p)).toBe(true);
    expect(getCachedAt(p)).toBeTypeOf("number");

    const saved = await listSaved();
    expect(saved).toHaveLength(1);
    expect(saved[0]?.path).toBe("/wiki-fe/dsa/patterns/sliding-window/");
  });

  it("evict -> gone from cache and cachedAt map", async () => {
    const p = "content/system-design/hld/twitter.md";
    await saveArticle(p);
    await evictArticle(p);
    expect(await isSaved(p)).toBe(false);
    expect(getCachedAt(p)).toBeNull();
    expect(await listSaved()).toHaveLength(0);
  });

  it("listSaved ignores non-article cache entries", async () => {
    await cache.put("/wiki-fe/data/glossary.json", new Response("{}"));
    await saveArticle("content/dsa/patterns/two-pointers.md");
    const saved = await listSaved();
    expect(saved.map((s) => s.path)).toEqual(["/wiki-fe/dsa/patterns/two-pointers/"]);
  });

  it("save returns false on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 404 })));
    expect(await saveArticle("content/dsa/patterns/x.md")).toBe(false);
  });

  it("also caches the page's _next/static assets into wiki-static", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith("/")
          ? new Response(
              '<script src="/wiki-fe/_next/static/chunks/abc.js"></script>' +
                '<link href="/wiki-fe/_next/static/chunks/page.css">',
              { status: 200 },
            )
          : new Response("asset", { status: 200 }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await saveArticle("content/dsa/patterns/sliding-window.md");

    const staticCache = caches_.get("wiki-static");
    const keys = (await (staticCache?.keys() ?? Promise.resolve([]))).map(
      (r) => new URL(r.url).pathname,
    );
    expect(keys).toContain("/wiki-fe/_next/static/chunks/abc.js");
    expect(keys).toContain("/wiki-fe/_next/static/chunks/page.css");
  });
});
