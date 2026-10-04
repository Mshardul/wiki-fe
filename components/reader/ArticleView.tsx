import type { ReactNode } from "react";
import { ReaderTopbar } from "@/components/chrome/ReaderTopbar";
import type { Article } from "@/lib/content/types";
import { CompleteButton } from "./CompleteButton";
import { ReaderIslands } from "./ReaderIslands";

interface ArticleViewProps {
  article: Pick<
    Article,
    "title" | "path" | "html" | "slug" | "verticalId" | "headings" | "isStub" | "readingTimeMin"
  >;
  backHref: string;
  // Rendered after the completion button; the real reader route puts related/backlink spines here.
  children?: ReactNode;
}

export function ArticleView({ article, backHref, children }: ArticleViewProps) {
  return (
    <>
      <ReaderTopbar
        leafTitle={article.title}
        backHref={backHref}
        articlePath={article.isStub ? undefined : article.path}
      />
      <main className="content-layout">
        <div className="content-main">
          <div className="article-hero">
            {!article.isStub && (
              <span className="read-time-badge">{article.readingTimeMin} min read</span>
            )}
          </div>

          {article.isStub ? (
            <div className="content-stub">
              <div className="content-stub-icon">✦</div>
              <h1 className="content-stub-title">{article.title}</h1>
              <p className="content-stub-msg">This article hasn&apos;t been written yet.</p>
            </div>
          ) : (
            // article.html is build-time output from lib/content: git-authored markdown, no user input, no runtime sanitiser
            <article
              id="markdown-body"
              className="markdown-body"
              // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
              dangerouslySetInnerHTML={{ __html: article.html }}
            />
          )}

          {!article.isStub && <CompleteButton wikiId={article.verticalId} path={article.path} />}
          {children}
        </div>

        <ReaderIslands
          article={{
            headings: article.headings,
            verticalId: article.verticalId,
            slug: article.slug,
            path: article.path,
            title: article.title,
            isStub: article.isStub,
          }}
        />
      </main>
    </>
  );
}
