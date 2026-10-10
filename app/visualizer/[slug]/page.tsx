import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndexTopbar } from "@/components/chrome/IndexTopbar";
import { VisualizerApp } from "@/components/visualizer/frame/VisualizerApp";
import { CANONICAL_BASE } from "@/lib/config";
import { getGlossary } from "@/lib/content/get-article";
import { getVisualizer, VISUALIZERS } from "@/lib/visualizer/registry";

export function generateStaticParams() {
  return VISUALIZERS.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = getVisualizer(slug);
  if (!v) return {};
  return {
    title: v.title,
    description: v.description,
    alternates: { canonical: `${CANONICAL_BASE}/visualizer/${v.slug}/` },
    robots: { index: false, follow: false },
  };
}

export default async function VisualizerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getVisualizer(slug)) notFound();
  return (
    <div className="viz-page">
      <IndexTopbar />
      <VisualizerApp slug={slug} glossary={getGlossary()} />
    </div>
  );
}
