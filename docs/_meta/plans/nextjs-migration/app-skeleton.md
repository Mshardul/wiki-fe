# App Skeleton + Deploy Pipeline Proof — Phase File (spec Sub-spec 2)

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Phases in order, inline, stop for review at each boundary. `- [ ]` checkboxes. Read [`overview.md`](./overview.md) first — its **Global Constraints** bind every step (no git steps; TDD red-green for units; pnpm; Node 22; stack versions). `content-foundation.md` must be at **exit-criteria green** before this file starts — `lib/content/` is imported here unchanged.

**Maps to:** spec [`../nextjs-migration-design.md`](../nextjs-migration-design.md) §5 Sub-spec 2, §4, §8.

**Deliverable:** the Next.js App Router project, a skeleton route tree that renders **real article HTML** from `lib/content`, the CSS port, PWA wiring, a CI `build` job (build + validate, **no deploy**), a full-corpus build benchmark, and the `wiki-be` CORS check. Everything is verified against a **local** production build — no remote deploy in this sub-spec. **New directories only; does not touch the vanilla app.** `index.html` + `js/**` + `wiki-sw.js` keep shipping unchanged.

**What this is NOT:** no interactivity, no client islands, no auth, no search, no `lib/api.ts`. Content rendering proven end-to-end; everything interactive is `cutover.md`.

---

## Interfaces consumed from `content-foundation.md`

```ts
import {
  getVerticals, getVertical, getArticleSlugs, getArticle,
  getManifest, getVerticalIndex,
} from "@/lib/content";
```
Exact signatures are fixed in `content-foundation.md`'s header block. This file **adds no content logic** — route files call these and render the result.

---

## Interfaces this phase file produces

```ts
// lib/config.ts — the single place basePath / origin live (spec §2 "forks kept open")
export const BASE_PATH = "/wiki-fe";
export const SITE_ORIGIN = "https://mshardul.github.io";   // adjust to the real Pages origin
export const CANONICAL_BASE = `${SITE_ORIGIN}${BASE_PATH}`;
```

Route tree (all server components, no `"use client"`):
- `app/layout.tsx` — root layout: imports global CSS + KaTeX CSS, inlines `sprite.svg`, mounts an empty chrome placeholder, registers the service worker
- `app/page.tsx` — home, vertical cards from `getVerticals()`
- `app/[vertical]/page.tsx` — vertical index from `getVerticalIndex()`, `generateStaticParams` from `getVerticals()`
- `app/[vertical]/[...slug]/page.tsx` — one article, `generateStaticParams` from `getArticleSlugs()`, body from `getArticle()`
- `app/not-found.tsx` — 404, static export emits `404.html`

---

## Global constraints specific to this phase file

- **pnpm only.** `pnpm add`, never npm/yarn.
- **`output: 'export'`** — no server runtime in production. Only build-time data fetching (`generateStaticParams`, module-level `getArticle`), no route handlers, no `dynamic`/`revalidate`, no server actions. Spec §12 names this a known constraint.
- **`basePath` / `assetPrefix`** centralised in `next.config.js` + `lib/config.ts`. No hand-built absolute URLs anywhere — `next/link` and Next's asset handling only.
- **`trailingSlash: true`** (spec §4).
- **CSS port is faithful** — `css/**` moves in nearly as-is, `tokens.css` unchanged. No Tailwind/Modules/CSS-in-JS. The UI/UX revamp is a separate later effort (memory `project-icon-library`).
- **Comments one line** (memory), **no ticket IDs** (memory), **no `console.*`** in committed code (repo rule + Biome `noConsole: error`).

---

## Phase 1 — Verify the lint/format toolchain against `.tsx` + add the CI `frontend` job

**Goal:** the toolchain was fully stood up **once** in `content-foundation.md` Phase 0 (TS, Vitest, ESLint flat config *including* the React/Next/hooks/a11y plugins, Biome). Those plugins were installed inert — no `.tsx` files existed. This phase confirms they now lint React code correctly and adds the CI gate. **No second toolchain setup** (overview.md "no wasted effort").

**Files:**
- Modify: `eslint.config.js` only if the tsx block's `files` glob or plugin wiring needs a fix; `package.json` scripts if a gap is found
- Modify: `.pre-commit-config.ci.yaml`
- Modify: `.github/workflows/ci.yml` — add a `frontend` job

- [ ] **Step 1: Confirm the ESLint flat config's React/Next block is live**

Run: `pnpm exec eslint --print-config app/layout.tsx 2>/dev/null || echo "no app/ yet"`. Since `app/` does not exist yet, instead lint a scratch `_probe.tsx` with a deliberate hooks violation:
```tsx
export function Bad() {
  if (Math.random() > 0.5) { const [x] = useState(0); return <div>{x}</div>; }
  return null;
}
```
Run: `pnpm exec eslint _probe.tsx`
Expected: reports `react-hooks/rules-of-hooks` and `react/react-in-jsx-scope` off. If it reports nothing, the tsx block's `files` glob or plugin wiring is wrong — fix. Delete `_probe.tsx`.

- [ ] **Step 2: Add a Biome/ESLint no-conflict check**

Create `_probe2.tsx` with unusual-but-valid formatting (long line, single quotes). Run `pnpm format` then `pnpm lint`. Confirm Biome reformats it and ESLint raises zero style complaints (proves `eslint-config-prettier` disabled the stylistic rules). Delete `_probe2.tsx`.

- [ ] **Step 3: Wire `pnpm lint` + `pnpm typecheck` + `pnpm test` into `.pre-commit-config.ci.yaml`**

Add a local hook block that runs all three. These become authoritative gates alongside the existing check-only hooks.

- [ ] **Step 4: Add a `frontend` job to `ci.yml`**

```yaml
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```
`node-version-file: .nvmrc` pins the exact patch (overview.md — no floating `22`). This job runs on every push/PR. It does NOT build or deploy — the `build` job is Phase 6, and there is no deploy job until the cutover.

- [ ] **Step 5: Confirm the job definition is valid**

Run: `pnpm exec eslint .github/` is not meaningful; instead validate YAML with a linter or `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"` via `.venv/bin/python3`. Expected: no parse error.

**Exit criteria:** `pnpm lint` catches a hooks violation and an a11y violation in a `.tsx` file; Biome and ESLint do not fight over style; `ci.yml` has a `frontend` job running typecheck + lint + test.

---

## Phase 2 — Next project scaffold + config

**Goal:** a Next.js App Router project configured for static export at the subpath. No routes render yet beyond a placeholder.

**Files:**
- Create: `next.config.js`, `next-env.d.ts`, `lib/config.ts`
- Modify: `package.json` (Next dep + `dev`/`build`/`start` scripts), `tsconfig.json` (Next plugin), `.gitignore` (`.next/`, `out/`)
- Create: `app/layout.tsx` (minimal), `app/page.tsx` (placeholder)

- [ ] **Step 1: Install Next + React**

Run: `pnpm add next@latest react@latest react-dom@latest` then `pnpm add -D @types/react @types/react-dom eslint-config-next`
Pin exact versions in `package.json` after install (no `^`).

- [ ] **Step 2: Create `lib/config.ts`**

```ts
export const BASE_PATH = "/wiki-fe";
export const SITE_ORIGIN = "https://mshardul.github.io";
export const CANONICAL_BASE = `${SITE_ORIGIN}${BASE_PATH}`;
```
Confirm the real GitHub Pages origin (check the repo's current Pages URL) and correct `SITE_ORIGIN` if the username/org differs.

- [ ] **Step 3: Create `next.config.js`**

```js
import { BASE_PATH } from "./lib/config.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
```
`images.unoptimized` is required for `output: 'export'`. Note: `lib/config.ts` needs a `.js`-resolvable import here — either duplicate the constant in a `.mjs` or use a plain string; simplest is a literal `"/wiki-fe"` in `next.config.js` with a one-line comment "keep in sync with lib/config.ts".

- [ ] **Step 4: Add Next scripts to `package.json`**

```json
"dev": "next dev",
"build": "next build",
"start": "next start"
```
Keep the existing `test`/`typecheck`/`lint`/`format` from `content-foundation.md` Phase 0.

- [ ] **Step 5: Update `tsconfig.json` for Next**

Add the Next plugin and JSX settings:
```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "allowJs": true,
    "incremental": true
  },
  "include": ["lib/**/*", "tests/**/*", "app/**/*", "components/**/*", "*.config.ts", "next-env.d.ts", ".next/types/**/*.ts"]
}
```
Merge with the existing config from `content-foundation.md` — do not drop `strict`, `noUncheckedIndexedAccess`, the `js/**` exclude, or the `@/*` path alias.

- [ ] **Step 6: Minimal `app/layout.tsx` + `app/page.tsx`**

```tsx
export const metadata = { title: "Wiki", description: "System Design and DSA interview prep." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```
```tsx
export default function Home() {
  return <main>skeleton</main>;
}
```

- [ ] **Step 7: Prove the build**

Run: `pnpm build`
Expected: `next build` succeeds, `out/` created with `out/wiki-fe/index.html` (the `basePath` puts everything under `/wiki-fe`). Open `out/wiki-fe/index.html` locally — it should say "skeleton".

- [ ] **Step 8: Run typecheck + lint on the new files**

Run: `pnpm typecheck && pnpm lint`
Expected: green.

**Exit criteria:** `pnpm build` emits a static `out/` under the `/wiki-fe` basePath. `pnpm dev` serves the placeholder at `http://localhost:3000/wiki-fe`. typecheck + lint green.

---

## Phase 3 — CSS port

**Goal:** `css/**` served by the Next app, cascade intact, `tokens.css` byte-unchanged, `--diagram-*` tokens added for Mermaid theming.

**Files:**
- Move: `css/**` stays where it is (Next can import from outside `app/`); OR copy into `app/` — decide based on what imports cleanly. Lean: keep `css/` at root, import via a relative path from `app/layout.tsx`.
- Modify: `app/layout.tsx` — import `../css/wiki.css` and the KaTeX stylesheet
- Modify: `css/tokens.css` — ADD `--diagram-*` tokens (only addition allowed to a "faithful port" file, needed by Phase 5)
- Create: `app/globals-note.md` — one-line note on the import strategy

- [ ] **Step 1: Import the CSS aggregator in the root layout**

In `app/layout.tsx`:
```tsx
import "../css/wiki.css";
import "katex/dist/katex.min.css";
```
`css/wiki.css` `@import`s all 27 modules in order. Shiki emits inline styles, so no highlight.js CSS import is needed — this replaces the `atom-one-dark.min.css` CDN link.

- [ ] **Step 2: Build and check the cascade**

Run: `pnpm build && pnpm dev`. Open `/wiki-fe`. The placeholder should now render on the dark `--bg` (#06070e) background with the app font. Inspect: confirm `tokens.css` custom properties resolve on `:root`, `themes.css` `data-theme` overrides are present, `responsive.css` media queries load.

- [ ] **Step 3: Add `--diagram-*` tokens to `tokens.css`**

Append to the `:root` block (and the `data-theme="light"` block in `themes.css` if diagrams need a distinct light palette):
```css
  --diagram-bg: var(--surface);
  --diagram-text: var(--text-body);
  --diagram-node-fill: var(--surface-2);
  --diagram-node-stroke: var(--border-2);
  --diagram-edge: var(--text-muted);
  --diagram-cluster-fill: var(--surface-3);
  --diagram-cluster-stroke: var(--border);
```
Values map to existing tokens — this is wiring, not new design. If `mermaid-spike-result.md` (from `content-foundation.md` Phase 1) recorded a specific token set the working `themeCSS` needs, match those names exactly.

- [ ] **Step 4: Add the Shiki dark-theme activation block to `css/view-content/code.css`**

Per `content-foundation.md` Phase 3 Step 8 / `shiki-dark-css.md`: `@shikijs/rehype` dual-theme output ships light `color` inline + `--shiki-dark` custom properties. Add, under the dark selector already used in `themes.css` / this file:
```css
:root[data-theme="dark"] .shiki,
:root[data-theme="dark"] .shiki span,
:root:not([data-theme="light"]) .shiki,
:root:not([data-theme="light"]) .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}
```
Confirm the exact property names against the installed `@shikijs/rehype` version. This is a rule, not a token — it does not touch `tokens.css`. Without it, code blocks stay light in dark mode.

- [ ] **Step 5: Verify no CSS 404s, no FOUC, code blocks theme correctly**

In `pnpm dev` DevTools Network tab: every `css/**` file loads (or is bundled), no 404. Reload a few times — no flash of unstyled content. Toggle `data-theme` in DevTools on an article with a code block — Shiki colours flip.

- [ ] **Step 6: Lint the CSS changes**

Run: `pnpm exec biome lint css/tokens.css css/themes.css css/view-content/code.css`
Expected: clean.

**Exit criteria:** the skeleton renders with the full app stylesheet, `tokens.css` unchanged except the appended `--diagram-*` block, KaTeX CSS loaded, the Shiki dark-activation rule in `code.css`, code blocks theme with the app, no CSS 404s, no FOUC.

---

## Phase 4 — Skeleton route tree rendering real article HTML

**Goal:** `/`, `/{vertical}`, `/{vertical}/{...slug}` all render from `lib/content`. Article bodies are real server-rendered HTML. No interactivity.

**Files:**
- Modify: `app/layout.tsx` — inline `sprite.svg`, SW registration script, chrome placeholder
- Rewrite: `app/page.tsx` — home
- Create: `app/[vertical]/page.tsx`, `app/[vertical]/[...slug]/page.tsx`, `app/not-found.tsx`
- Create: `app/page.test.tsx` and route tests (Vitest + a React test renderer for server components — decide: `@testing-library/react` with RSC support, or render the component function directly and assert on the returned tree)

- [ ] **Step 1: Failing test — home lists both verticals**

`app/page.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { getVerticals } from "@/lib/content";

describe("home data", () => {
  it("has both verticals with derived counts", async () => {
    const vs = await getVerticals();
    expect(vs.map((v) => v.id).sort()).toEqual(["dsa", "system-design"]);
    for (const v of vs) expect(v.articleCount).toBeGreaterThan(0);
  });
});
```
(A pure data test — full component render tests come after the RSC test setup decision in Step 6.)

- [ ] **Step 2: Run, confirm pass** (data comes from `content-foundation.md`).

- [ ] **Step 3: Implement `app/page.tsx`**

```tsx
import Link from "next/link";
import { getVerticals } from "@/lib/content";

export default async function Home() {
  const verticals = await getVerticals();
  return (
    <main className="home-view">
      <div className="wiki-card-grid">
        {verticals.map((v) => (
          <Link key={v.id} href={`/${v.id}`} className="wiki-card" style={{ "--card-color": v.color } as React.CSSProperties}>
            <span className="wiki-card-icon">{v.icon}</span>
            <h2 className="wiki-card-title">{v.title}</h2>
            <p className="wiki-card-desc">{v.description}</p>
            <span className="wiki-card-count">{v.articleCount} articles</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
```
Reuse the class names from `css/view-home.css` (`.home-view`, `.wiki-card-grid`, `.wiki-card` — grep the CSS for the real names and match). This is a faithful visual port, not a redesign.

- [ ] **Step 4: Implement `app/[vertical]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVerticals, getVertical, getVerticalIndex } from "@/lib/content";

export function generateStaticParams() {
  return getVerticals().map((v) => ({ vertical: v.id }));
}

export default async function VerticalIndex({ params }: { params: Promise<{ vertical: string }> }) {
  const { vertical } = await params;
  const v = getVertical(vertical);
  if (!v) notFound();
  const index = await getVerticalIndex(vertical);
  return (
    <main className="index-view">
      <h1>{v.title}</h1>
      {index.sections.map((s) => (
        <section key={s.heading} className="index-section">
          <h2>{s.heading}</h2>
          <ul className="index-card-grid">
            {s.articles.map((a) => (
              <li key={a.path} className={a.isStub ? "index-card index-card--stub" : "index-card"}>
                <Link href={`/${vertical}/${a.slug.join("/")}`}>{a.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
```
Match class names to `css/view-index.css`.

- [ ] **Step 5: Implement `app/[vertical]/[...slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getArticleSlugs, getArticle } from "@/lib/content";

export async function generateStaticParams() {
  return getArticleSlugs();
}

export default async function Article({ params }: { params: Promise<{ vertical: string; slug: string[] }> }) {
  const { vertical, slug } = await params;
  const article = await getArticle(vertical, slug);
  if (!article) notFound();
  return (
    <main className="content-view">
      <article className="markdown-body" dangerouslySetInnerHTML={{ __html: article.html }} />
    </main>
  );
}
```
`article.html` is trusted build-time output from `lib/content` (git-authored markdown, no user input) — `dangerouslySetInnerHTML` is correct here and replaces the vanilla app's DOMPurify-at-runtime (which existed only because Showdown ran client-side on fetched content). Add a one-line comment saying so.

- [ ] **Step 6: RSC test setup + article render test**

Install: `pnpm add -D @testing-library/react @testing-library/dom jsdom`. Add a `jsdom` Vitest project or environment override for `*.test.tsx`. Then a test that renders the article page for a known real slug and asserts the HTML contains expected structural markers (`<h2`, a `.section` wrapper from `remark-section-wrap`, a `.callout` if the fixture article has one). If RSC async components don't render cleanly in the test env, fall back to: call `getArticle` directly and assert on `article.html` — the page component is a thin wrapper.

- [ ] **Step 7: Implement `app/not-found.tsx`**

```tsx
export default function NotFound() {
  return (
    <main className="content-view">
      <h1>Page not found</h1>
      <p>This page doesn&apos;t exist. <a href="/wiki-fe/">Back to the wiki</a>.</p>
    </main>
  );
}
```
Static export emits this as `out/wiki-fe/404.html` (spec §4). Note: the vanilla `404.html` at repo root is separate and stays until `cutover.md`.

- [ ] **Step 8: Inline `sprite.svg` in the root layout**

In `app/layout.tsx`, read `sprite.svg` at build time (it is static) and inline it as the first child of `<body>`, `hidden`. Replaces `js/icon-sprite.js`'s runtime fetch (spec §13 decision). One request, no FOUC.
```tsx
import { readFileSync } from "node:fs";
const sprite = readFileSync("sprite.svg", "utf8");
// ...in body:
<div hidden dangerouslySetInnerHTML={{ __html: sprite }} />
```

- [ ] **Step 9: Add the chrome placeholder + SW registration to the layout**

Add an empty `<header className="topbar" />` placeholder (filled by a `cutover.md` island) and a small inline script that registers `/wiki-fe/sw.js` with scope `/wiki-fe/` — guarded by `"serviceWorker" in navigator`. The actual SW file is Phase 5.

- [ ] **Step 10: Build the whole tree**

Run: `pnpm build`
Expected: `out/wiki-fe/` contains `index.html`, `dsa/index.html`, `system-design/index.html`, and an `index.html` for every article under each vertical, plus `404.html`. The article HTML count should equal `getArticleSlugs().length` from `content-foundation.md` — assert that, don't hardcode a number.

- [ ] **Step 11: Local visual check**

`pnpm dev`, open `/wiki-fe`, click into a vertical, click into an article. The article body renders with headings, code (Shiki-highlighted), tables, callouts, math (KaTeX). Diagrams: if `mermaid-spike-result.md` = PASS, inline SVGs appear; if FAIL, a placeholder (island comes in `cutover.md`). This is a genuine visual check — allowed (memory `feedback-visual-companion-use`).

- [ ] **Step 12: typecheck + lint + test**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

**Exit criteria:** all three route levels render from `lib/content`. `pnpm build` emits one page per article (count = `getArticleSlugs().length`) + 2 index pages + home + `404.html` under `out/wiki-fe/`. Article HTML is real, server-rendered, styled. No interactivity (expected). typecheck + lint + test green.

---

## Phase 5 — PWA wiring (Serwist, injectManifest)

**Goal:** the offline model from spec §8 — shell precache + runtime article caching — via `@serwist/next`. No save/evict UI (that is `cutover.md`), but the SW is installed, scoped, and caching.

**Files:**
- Create: `app/sw.ts` — the Serwist service worker source (injectManifest entry)
- Create: `app/offline/page.tsx` — the offline fallback route (replaces `OFFLINE_FALLBACK_MD` string)
- Modify: `next.config.js` — wrap with `withSerwist`
- Modify: `app/layout.tsx` — SW registration (from Phase 4 Step 9, now pointing at the real build output)
- Create: `public/manifest.webmanifest` — the web app manifest, ported from `manifest.json`
- Create: `app/sw.test.ts` — assert the precache list shape

- [ ] **Step 1: Confirm Serwist is still the right pick**

Check `@serwist/next` on npm — last publish date, open issues re: App Router + `output: 'export'`. If it has gone stale since this plan was written, re-evaluate maintained Workbox-for-Next wrappers (spec §13 says do this at Sub-spec 2 start). Record the decision in a one-line note in `app/sw.ts`.

- [ ] **Step 2: Install**

Run: `pnpm add @serwist/next && pnpm add -D serwist`

- [ ] **Step 3: Wrap `next.config.js`**

```js
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  scope: "/wiki-fe/",
  reloadOnOnline: true,
});

export default withSerwist(nextConfig);
```

- [ ] **Step 4: Write `app/sw.ts` — the offline model from spec §8**

```ts
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: (string | { url: string; revision: string | null })[] };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,   // shell only: hashed CSS/JS/font assets, home + vertical index HTML, the webmanifest
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      // article pages: stale-while-revalidate so recently-read articles work offline without an explicit save (spec §8 "runtime-cache on visit")
      matcher: ({ url }) => /\/wiki-fe\/(dsa|system-design)\/.+/.test(url.pathname),
      handler: "StaleWhileRevalidate",
      options: { cacheName: "wiki-articles" },
    },
    {
      // data/*.json — precacheable static assets, served from public/data/
      matcher: ({ url }) => url.pathname.startsWith("/wiki-fe/data/"),
      handler: "StaleWhileRevalidate",
      options: { cacheName: "wiki-data" },
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/wiki-fe/offline/", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
```
Key spec §8 points enforced: shell precache does NOT include article bodies; articles are runtime-cached on visit; an uncached article offline falls back to `/offline/`. The explicit "Save for offline" + per-article evict is a `cutover.md` island that writes into the `wiki-articles` cache directly.

- [ ] **Step 5: Failing test for the precache scope**

`app/sw.test.ts` — a static check that `app/sw.ts` does NOT reference article paths in `precacheEntries` and DOES have the article runtime-caching rule. Parse the file, assert the `matcher` for `StaleWhileRevalidate` covers `/dsa/` and `/system-design/`. (This guards the "small shell, not the whole site" requirement — spec §8 "Why not precache everything".)

- [ ] **Step 6: Run, confirm pass** (or fix `sw.ts` until it does).

- [ ] **Step 7: Implement `app/offline/page.tsx`**

```tsx
export default function Offline() {
  return (
    <main className="content-view">
      <h1>You&apos;re offline</h1>
      <p>This article hasn&apos;t been downloaded for offline reading. Reconnect, or open Settings → Offline to save articles ahead of time.</p>
    </main>
  );
}
```
Same copy as the old `OFFLINE_FALLBACK_MD`, now a real route.

- [ ] **Step 8: Port the web app manifest**

Create `public/manifest.webmanifest` from the current `manifest.json`, changing:
- `"id": "/wiki-fe/"`, `"start_url": "/wiki-fe/"`, `"scope": "/wiki-fe/"`
- shortcut URLs: `./#system-design` → `/wiki-fe/system-design/`, `./#dsa` → `/wiki-fe/dsa/`, `./?search=1` → `/wiki-fe/` (search is a `cutover.md` island; leave the shortcut pointing home for now with a one-line note)
- icon `src` paths: `/wiki-fe/icon.svg`, `/wiki-fe/icons/icon-192.png`, etc.
Reference it in `app/layout.tsx` metadata: `manifest: "/wiki-fe/manifest.webmanifest"`.

- [ ] **Step 9: Build and inspect the generated SW**

Run: `pnpm build`. Open `out/wiki-fe/sw.js` (or `public/sw.js`). Confirm the precache manifest lists hashed assets + `index.html` + `dsa/index.html` + `system-design/index.html` + the webmanifest — and does NOT list individual article HTML files.

- [ ] **Step 10: Local SW test**

`pnpm dev` (or serve `out/` statically — SW needs HTTPS or localhost). DevTools → Application → Service Workers: SW registered, scope `/wiki-fe/`. Load an article, go offline (DevTools), reload — it serves from `wiki-articles` cache. Load a never-visited article offline — `/offline/` page shows.

- [ ] **Step 11: typecheck + lint + test**

Run: `pnpm typecheck && pnpm lint && pnpm test`

**Exit criteria:** SW registers at scope `/wiki-fe/`, precaches the shell only (verified: no article bodies), runtime-caches articles on visit, falls back to `/offline/` for uncached articles offline. Web app manifest ported with subpath URLs. `data/*.json` runtime-cached. Tests green.

---

## Phase 6 — CI `build` job + local build verification (no deploy)

**Goal:** a CI job that builds the static site end to end (content pipeline + link-check gate + Mermaid, if build-time) and a **local** verification that the static `out/` works under the subpath. **No remote deploy in this phase** — single-person repo, one `github.io` site, a staging deploy would only overwrite the live vanilla app. The first real Pages deploy is `cutover.md` Phase 14.

**Files:**
- Modify: `.github/workflows/ci.yml` — add a `build` job (build + validate, no deploy)

- [ ] **Step 1: Add the `build` job to `ci.yml`**

```yaml
  build:
    needs: [frontend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      # Build-time Mermaid only — omit this whole block if the spike chose the client-island fallback.
      - name: Cache Playwright browser
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: mermaid-chromium-${{ hashFiles('pnpm-lock.yaml') }}
      - run: pnpm exec playwright install --with-deps chromium
      - name: Build static site
        run: pnpm build
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: out
          path: out
```
`needs: [frontend]` — build only runs if typecheck + lint + test passed. The link-check gate (`validateLinks` from `content-foundation.md`) runs inside `pnpm build` via `buildContent()` — a broken cross-link fails the build. The artifact is uploaded so the e2e jobs (later) can run against it; **it is not deployed anywhere**.

- [ ] **Step 2: If `mermaid-spike-result.md` chose the client-island fallback** — delete the "Cache Playwright browser" + "playwright install" steps from the `build` job. The build has no headless render.

- [ ] **Step 3: Local production build + serve**

Run: `pnpm build` then serve the output — `npx serve out` (or `python3 -m http.server` from inside `out/`). Open the URL at the `/wiki-fe/` path.

- [ ] **Step 4: Verify against the local build**

- `/wiki-fe/` loads, both vertical cards render
- click into `dsa` — index renders, sections + article links
- click into an article — real HTML, styled, Shiki code, KaTeX math; Mermaid SVGs re-theme when you toggle `data-theme` in DevTools (build-time path) or render on mount (fallback path)
- every asset loads (Network tab, no 404 — the `basePath` / `assetPrefix` proof, spec §12 risk)
- SW registers at `/wiki-fe/` scope (SW needs `localhost` or HTTPS — `npx serve` on localhost is fine)
- `/wiki-fe/nonexistent/` serves the `404.html`
- each page has a correct `<title>` in the browser tab

This is a genuine visual/behavioural check — allowed (memory `feedback-visual-companion-use`).

**Exit criteria:** CI `frontend` → `build` green (build + link-check, no deploy). The local production build renders every route correctly under `/wiki-fe/`; `basePath` / `assetPrefix` / SW-scope all verified against the served `out/`. Article HTML renders and themes correctly (Mermaid included). No SEO check. Vanilla app untouched and still serving.

---

## Phase 7 — Full-corpus build-time benchmark (spec §5 "prove riskiest infra")

**Goal:** measure `next build` wall-clock and memory over the whole corpus once, locally, and record a ceiling. This is the one-time full run agreed in planning; CI thereafter renders diagrams only for changed articles (via the per-diagram SVG cache from `content-foundation.md` Phase 7). If build-time Mermaid proves slow or flaky here, this is where you switch to the client-island fallback (spec §7 — pre-authorised, not a blocker).

**Files:**
- Create: `docs/_meta/plans/nextjs-migration/build-benchmark.md`

- [ ] **Step 1: Clean build, timed**

Run: `rm -rf .next out lib/content/generated/.mermaid-cache && time pnpm build`
Record: total wall-clock, and if the machine allows, peak RSS (`/usr/bin/time -l pnpm build` on macOS).

- [ ] **Step 2: Warm build, timed**

Run: `time pnpm build` again (SVG cache now warm). Record the delta — this is what a typical CI build costs once the cache is populated.

- [ ] **Step 3: Count the Chromium launches**

Instrument the mermaid plugin (or check its logs) to count headless renders on the cold vs warm build. Cold ≈ (number of distinct mermaid blocks in the corpus); warm ≈ 0. Confirm one browser instance is reused across all diagrams (spec §7) — not one per diagram.

- [ ] **Step 4: Record `build-benchmark.md`**

- cold build: Xs, peak RSS Y MB, N Chromium renders
- warm build: Xs, 0 renders
- distinct mermaid blocks in corpus: N
- **ceiling:** if a cold CI build exceeds ~8 min or the runner OOMs (2 vCPU / 7 GB, per `ci.yml` comment), revisit — options: shard the build, pre-render diagrams in a separate cached job, or move to the client-island fallback.
- confirmation: CI's diff-only diagram rendering keeps warm builds well under the ceiling.

- [ ] **Step 5: If the cold build is already near the ceiling** — flag it now, before `cutover.md`. The fix (build sharding or a dedicated diagram-cache job) is small and belongs here, not discovered mid-cutover.

**Exit criteria:** `build-benchmark.md` records cold + warm build cost and a documented ceiling. Chromium-reuse confirmed (if build-time Mermaid). If near the ceiling, mitigation identified.

---

## Phase 8 — `wiki-be` CORS check + file the ticket

**Goal:** the personal layer (`lib/api.ts` + auth + synced domains) ships at cutover. Verify the FE→BE contract survives the migration and file the one `wiki-be` ticket **now**, before cutover — not after (spec §11, overview.md §13 decision). If the origin the FE calls from changes and CORS isn't updated, the personal layer breaks at the switch.

**Files:**
- Create: a ticket row in the `wiki-be` backlog (locate it — read `wiki-be/CLAUDE.md` first for the ticket protocol and backlog file)

- [ ] **Step 1: Determine the production origin** — the Next app deploys to the same GitHub Pages site as today: origin `https://mshardul.github.io`, path `/wiki-fe/`. CORS is origin-scoped, so a same-origin move means **no CORS change** — but confirm against the actual current Pages URL (check repo Settings → Pages), don't assume.

- [ ] **Step 2: Check `wiki-be`'s current CORS allowlist** — read `wiki-be`'s CORS config (grep `CORS`, `allow_origins`, `ALLOWED_ORIGINS` in `wiki-be/`). Confirm `https://mshardul.github.io` is already on it (the vanilla app calls from there today, so it must be).

- [ ] **Step 3: Read `wiki-be/CLAUDE.md`** — its session-start protocol, ticket classification, where the backlog lives, the `WIKI-BE-xxx` id scheme. Match an existing ticket row's format exactly.

- [ ] **Step 4: File the ticket** — `WIKI-BE-xxx`, content per spec §11:
  - confirm the `/api/v1` contract is unchanged by the migration (it is — Next calls the same endpoints identically)
  - update the CORS allowlist **only if** Step 1/2 found the origin string changing (expected: no change — record "verified, no change needed" if so)
  - record "server-to-server auth for a future BFF/SSR layer" as a deferred item tied to the Shape C / Vercel fork (spec §2)

- [ ] **Step 5: If Step 2 found the origin missing or a change needed** — the ticket is now blocking: cutover cannot ship the personal layer until `wiki-be` resolves it. Flag this in the exit gate.

**Exit criteria:** the `wiki-be` ticket is filed. The production origin is confirmed against the real Pages URL. If CORS needs a change, it is called out as a cutover blocker.

---

## Phase 9 — Sub-spec 2 exit gate

**Files:**
- Create: `docs/_meta/plans/nextjs-migration/sub-spec-2-exit.md`

- [ ] **Step 1: Fill the exit checklist against spec §5 Sub-spec 2 exit criteria**
  - local production build renders every route correctly under `/wiki-fe/` ✅/❌
  - `basePath` / asset / SW-scope verified against the served `out/` ✅/❌
  - article HTML renders and themes correctly (Mermaid included) ✅/❌
  - full-corpus build time recorded, ceiling documented ✅/❌ + link to `build-benchmark.md`
  - CI `frontend` + `build` jobs green (no deploy job) ✅/❌ + run link
  - `wiki-be` CORS confirmed; ticket filed ✅/❌ + ticket id
  - vanilla app unaffected — `index.html` + `js/**` + `wiki-sw.js` byte-unchanged, still serving ✅/❌

- [ ] **Step 2: Full local check** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, all green.

- [ ] **Step 3: Checkpoint** — report. Do not start `cutover.md` until reviewed. `cutover.md` is the atomic replacement; it must not begin on a shaky skeleton.

**Exit criteria:** `sub-spec-2-exit.md` all ✅ (or ❌ with accepted-tradeoff notes). The skeleton is a proven, benchmarked base verified locally. `lib/content`'s public surface is confirmed sufficient for real routes. The `wiki-be` ticket is filed.
