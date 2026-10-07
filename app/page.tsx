import type { Metadata } from "next";
import Link from "next/link";
import { HomeTopbar } from "@/components/home/HomeTopbar";
import { PinnedWikis } from "@/components/home/PinnedWikis";
import { WikiCardsKeyNav } from "@/components/home/WikiCardsKeyNav";
import { CANONICAL_BASE } from "@/lib/config";
import { getVerticals } from "@/lib/content";
import { VISUALIZERS } from "@/lib/visualizer/registry";

export const metadata: Metadata = {
  title: { absolute: "Wiki — System Design & DSA" },
  description: "A fast, offline-capable reference wiki for System Design and DSA interview prep.",
  alternates: { canonical: `${CANONICAL_BASE}/` },
  robots: { index: false, follow: false },
};

export default function Home() {
  const verticals = getVerticals();
  return (
    <>
      <HomeTopbar />
      <main className="home-main">
        <WikiCardsKeyNav />
        <PinnedWikis />
        <header className="home-header">
          <p className="home-eyebrow">Reference</p>
          <h1 className="home-title">Wiki</h1>
          <p className="home-subtitle">System Design and DSA interview prep.</p>
        </header>
        <div className="wiki-grid">
          {verticals.map((v) => (
            <div key={v.id} className="wiki-card-wrap" data-wiki-id={v.id}>
              {/* Outside the <a> — a button inside a link is nested interactive content. */}
              <button
                type="button"
                className="wiki-card-pin-btn"
                aria-label={`Pin ${v.title}`}
                tabIndex={-1}
              >
                ☆
              </button>
              <Link href={`/${v.id}`} className="wiki-card">
                <div className="wiki-card-icon">{v.icon}</div>
                <div className="wiki-card-body">
                  <h2 className="wiki-card-title">{v.title}</h2>
                  <p className="wiki-card-desc">{v.description}</p>
                </div>
                <div className="wiki-card-footer">
                  <span className="wiki-card-count">{v.articleCount} articles</span>
                  <span className="wiki-card-arrow">→</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
        {/* Separate grid: PinnedWikis and card key-nav only manage the vertical cards. */}
        <div className="wiki-grid wiki-grid--tools">
          <Link href="/visualizer/" className="wiki-card">
            <div className="wiki-card-icon">🎞️</div>
            <div className="wiki-card-body">
              <h2 className="wiki-card-title">Visualizer</h2>
              <p className="wiki-card-desc">
                Animated, step-by-step explanations — starting with cache eviction.
              </p>
            </div>
            <div className="wiki-card-footer">
              <span className="wiki-card-count">
                {VISUALIZERS.length} {VISUALIZERS.length === 1 ? "visualizer" : "visualizers"}
              </span>
              <span className="wiki-card-arrow">→</span>
            </div>
          </Link>
        </div>
      </main>
    </>
  );
}
