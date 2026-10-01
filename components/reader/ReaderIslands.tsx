"use client";

import { useEffect, useState } from "react";
import { ScrollToTop } from "@/components/chrome/ScrollToTop";
import { TocDrawer } from "@/components/mobile/TocDrawer";
import type { Article } from "@/lib/content/types";
import { AnchorScroll } from "./AnchorScroll";
import { ArticleFind } from "./ArticleFind";
import { CalloutCollapse } from "./CalloutCollapse";
import { CardCompletion } from "./CardCompletion";
import { CaveatReveal } from "./CaveatReveal";
import { CodeCopy } from "./CodeCopy";
import { ComparisonTable } from "./ComparisonTable";
import { EscapeToIndex } from "./EscapeToIndex";
import { FocusMode } from "./FocusMode";
import { GlossaryPopover } from "./GlossaryPopover";
import { HeadingCollapse } from "./HeadingCollapse";
import { HighlightsIsland } from "./Highlights";
import { HoverPreview } from "./HoverPreview";
import { LatexToggle } from "./LatexToggle";
import { MermaidDiagrams } from "./MermaidDiagrams";
import { NotesScratchpad } from "./NotesScratchpad";
import { PracticeAnswerToggle } from "./PracticeAnswerToggle";
import { PrereqStatus } from "./PrereqStatus";
import { ProgressRing } from "./ProgressRing";
import { ReadTracker } from "./ReadTracker";
import { ScrollRestore } from "./ScrollRestore";
import { StickyHeader } from "./StickyHeader";
import { TabbedCode } from "./TabbedCode";
import { Toc } from "./Toc";
import { ZoomLightbox } from "./ZoomLightbox";

interface ReaderIslandsProps {
  article: Pick<Article, "headings" | "verticalId" | "slug" | "path" | "title" | "isStub">;
}

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
      <EscapeToIndex verticalId={article.verticalId} />
      <StickyHeader />
      <aside id="toc-sidebar" className="toc-sidebar">
        <div className="toc-header">
          <span className="toc-label">On this page</span>
        </div>
        <Toc headings={article.headings} />
        {!article.isStub && (
          <NotesScratchpad
            key={`${article.verticalId}:${articlePath}`}
            wikiId={article.verticalId}
            articlePath={articlePath}
          />
        )}
      </aside>
      <TocDrawer />

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
        <>
          <ReadTracker
            wikiId={article.verticalId}
            path={article.path}
            title={article.title}
            slug={article.slug}
          />
          <ScrollRestore wikiId={article.verticalId} articlePath={articlePath} />
          <HighlightsIsland wikiId={article.verticalId} articlePath={articlePath} />
        </>
      )}
      <HoverPreview />
      <CardCompletion wikiId={article.verticalId} />
    </>
  );
}
