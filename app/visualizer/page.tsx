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
        {(
          [
            [
              "compare",
              "Compare algorithms",
              "Pick one, change the inputs, and watch what changes.",
            ],
            [
              "mechanism",
              "Watch a mechanism",
              "Step through it, then through the cases where it breaks.",
            ],
          ] as const
        ).map(([kind, heading, subtitle]) => {
          const cards = VISUALIZERS.filter((v) => v.kind === kind);
          if (cards.length === 0) return null;
          return (
            <section key={kind} className="viz-index-group">
              <div className="viz-index-group__head">
                <h2>{heading}</h2>
                <p>{subtitle}</p>
              </div>
              <div className="wiki-grid">
                {cards.map((v) => (
                  <Link key={v.slug} href={`/visualizer/${v.slug}/`} className="wiki-card">
                    <div className="wiki-card-icon">{v.icon}</div>
                    <div className="wiki-card-body">
                      <h3 className="wiki-card-title">{v.title}</h3>
                      <p className="wiki-card-desc">{v.description}</p>
                    </div>
                    <div className="wiki-card-footer">
                      <span className="wiki-card-count">Open</span>
                      <span className="wiki-card-arrow">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
