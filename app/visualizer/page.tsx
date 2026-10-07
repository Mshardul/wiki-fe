import type { Metadata } from "next";
import Link from "next/link";
import { IndexTopbar } from "@/components/chrome/IndexTopbar";
import { CANONICAL_BASE } from "@/lib/config";
import { VISUALIZERS } from "@/lib/visualizer/registry";

export const metadata: Metadata = {
  title: "Visualizer",
  description: "Animated, step-by-step explanations of DSA and system-design concepts.",
  alternates: { canonical: `${CANONICAL_BASE}/visualizer/` },
  robots: { index: false, follow: false },
};

export default function VisualizerIndex() {
  return (
    <>
      <IndexTopbar />
      <main className="index-main">
        <div className="page-hero">
          <div className="page-hero-inner">
            <h1 className="page-title">Visualizer</h1>
            <p className="page-subtitle">
              Animated, step-by-step explanations — watch a concept run, then drive it yourself.
            </p>
          </div>
        </div>
        <div className="wiki-grid">
          {VISUALIZERS.map((v) => (
            <Link key={v.slug} href={`/visualizer/${v.slug}/`} className="wiki-card">
              <div className="wiki-card-icon">{v.icon}</div>
              <div className="wiki-card-body">
                <h2 className="wiki-card-title">{v.title}</h2>
                <p className="wiki-card-desc">{v.description}</p>
              </div>
              <div className="wiki-card-footer">
                <span className="wiki-card-count">Open</span>
                <span className="wiki-card-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
