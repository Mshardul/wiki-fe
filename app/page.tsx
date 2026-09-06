import Link from "next/link";
import { getVerticals } from "@/lib/content";

export default function Home() {
  const verticals = getVerticals();
  return (
    <main className="home-main">
      <header className="home-header">
        <p className="home-eyebrow">Reference</p>
        <h1 className="home-title">Wiki</h1>
        <p className="home-subtitle">System Design and DSA interview prep.</p>
      </header>
      <div className="wiki-grid">
        {verticals.map((v) => (
          <Link key={v.id} href={`/${v.id}`} className="wiki-card" data-wiki-id={v.id}>
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
        ))}
      </div>
    </main>
  );
}
