import Link from "next/link";

export default function NotFound() {
  return (
    <main className="content-layout">
      <div className="content-main">
        <article className="markdown-body">
          <h1>Page not found</h1>
          <p>
            This page doesn&apos;t exist. <Link href="/">Back to the wiki</Link>.
          </p>
        </article>
      </div>
    </main>
  );
}
