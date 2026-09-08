"use client";

import { useEffect, useState } from "react";
import { ScrollToTop } from "@/components/chrome/ScrollToTop";
import type { Article } from "@/lib/content/types";
import { AnchorScroll } from "./AnchorScroll";
import { ArticleFind } from "./ArticleFind";
import { CalloutCollapse } from "./CalloutCollapse";
import { CardCompletion } from "./CardCompletion";
import { CaveatReveal } from "./CaveatReveal";
import { CodeCopy } from "./CodeCopy";
import { ComparisonTable } from "./ComparisonTable";
import { FocusMode } from "./FocusMode";
import { GlossaryPopover } from "./GlossaryPopover";
import { HeadingCollapse } from "./HeadingCollapse";
import { HoverPreview } from "./HoverPreview";
import { LatexToggle } from "./LatexToggle";
import { MermaidDiagrams } from "./MermaidDiagrams";
import { PracticeAnswerToggle } from "./PracticeAnswerToggle";
import { PrereqStatus } from "./PrereqStatus";
import { ProgressRing } from "./ProgressRing";
import { ReadTracker } from "./ReadTracker";
import { StickyHeader } from "./StickyHeader";
import { TabbedCode } from "./TabbedCode";
import { Toc } from "./Toc";
import { ZoomLightbox } from "./ZoomLightbox";

interface ReaderIslandsProps {
  article: Pick<Article, "headings" | "verticalId" | "slug" | "path" | "title" | "isStub">;
}

// Single client wrapper the article page mounts; composes every reader island so the page
// stays a thin server component.
export function ReaderIslands({ article }: ReaderIslandsProps) {
  const [focusMode, setFocusMode] = useState(false);
  const articlePath = article.slug.join("/");

  useEffect(() => {
    const onToggle = () => setFocusMode((v) => !v);
    document.addEventListener("wiki:toggle-focus-mode", onToggle);
    return () => document.removeEventListener("wiki:toggle-focus-mode", onToggle);
  }, []);

  return (
    <>
      <ProgressRing />
      <StickyHeader />
      <aside id="toc-sidebar" className="toc-sidebar">
        <div className="toc-header">
          <span className="toc-label">On this page</span>
        </div>
        <Toc headings={article.headings} />
      </aside>

      <HeadingCollapse wikiId={article.verticalId} articlePath={articlePath} />
      <AnchorScroll />
      <FocusMode active={focusMode} />
      <ScrollToTop />

      <CalloutCollapse />
      <LatexToggle />
      <TabbedCode />
      <ArticleFind />
      <GlossaryPopover />
      <CaveatReveal />
      <CodeCopy />
      <ComparisonTable wikiId={article.verticalId} articlePath={articlePath} />
      <ZoomLightbox />
      <PracticeAnswerToggle />
      <PrereqStatus wikiId={article.verticalId} />
      <MermaidDiagrams />

      {!article.isStub && (
        <ReadTracker
          wikiId={article.verticalId}
          path={article.path}
          title={article.title}
          slug={article.slug}
        />
      )}
      <HoverPreview />
      <CardCompletion wikiId={article.verticalId} />
    </>
  );
}
