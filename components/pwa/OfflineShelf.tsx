"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { IndexTopbar } from "@/components/chrome/IndexTopbar";
import {
  evictArticle,
  listSaved,
  routeToArticlePath,
  type SavedArticle,
} from "@/lib/pwa/article-cache";

export interface ShelfArticleMeta {
  route: string;
  title: string;
  verticalId: string;
  verticalTitle: string;
}

function formatCachedAt(ts: number): string {
  if (!ts) return "";
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "Cached today";
  if (days === 1) return "Cached yesterday";
  if (days < 30) return `Cached ${days}d ago`;
  return `Cached ${new Date(ts).toLocaleDateString()}`;
}

export function OfflineShelf({ articles }: { articles: ShelfArticleMeta[] }) {
  const [saved, setSaved] = useState<SavedArticle[] | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  const refresh = useCallback(() => {
    void listSaved().then(setSaved);
  }, []);

  useEffect(() => {
    refresh();
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [refresh]);

  const metaByRoute = new Map(articles.map((a) => [a.route, a]));

  const groups = new Map<string, { title: string; rows: SavedArticle[] }>();
  for (const row of saved ?? []) {
    const meta = metaByRoute.get(row.path);
    const key = meta?.verticalId ?? "other";
    const title = meta?.verticalTitle ?? "Other";
    if (!groups.has(key)) groups.set(key, { title, rows: [] });
    groups.get(key)?.rows.push(row);
  }

  return (
    <>
      <IndexTopbar />
      <main className="content-layout">
        <div className="content-main">
          <div className="article-hero">
            <h1>Offline shelf</h1>
            <span
              className={`offline-shelf-status${online ? "" : " offline-shelf-status--offline"}`}
            >
              {online ? "Online" : "Offline — showing what's available"}
            </span>
          </div>

          {saved == null ? (
            <p className="offline-shelf-empty">Loading…</p>
          ) : saved.length === 0 ? (
            <p className="offline-shelf-empty">
              No articles saved for offline reading yet. Open an article and tap the download icon
              to add it here.
            </p>
          ) : (
            <div className="offline-shelf-groups">
              {[...groups.values()].map((group) => (
                <section className="offline-shelf-group" key={group.title}>
                  <div className="offline-shelf-group-header">
                    <h2 className="offline-shelf-wiki-title">{group.title}</h2>
                  </div>
                  <ul className="offline-shelf-list">
                    {group.rows.map((row) => {
                      const meta = metaByRoute.get(row.path);
                      const label = meta?.title ?? row.path;
                      const date = formatCachedAt(row.cachedAt);
                      return (
                        <li className="offline-shelf-entry" key={row.path}>
                          <svg className="icon" aria-hidden="true">
                            <use href="#icon-check" />
                          </svg>
                          <Link
                            className="offline-shelf-entry-body"
                            href={row.path.replace(/^\/wiki-fe/, "")}
                          >
                            <span className="offline-shelf-entry-title">{label}</span>
                            {date && <span className="offline-shelf-entry-date">{date}</span>}
                          </Link>
                          <button
                            type="button"
                            className="offline-shelf-evict-btn"
                            title="Remove from offline storage"
                            aria-label={`Remove ${label} from offline storage`}
                            onClick={() => {
                              void evictArticle(routeToArticlePath(row.path)).then(refresh);
                            }}
                          >
                            <svg className="icon" aria-hidden="true">
                              <use href="#icon-x" />
                            </svg>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
