# App Skeleton + Deploy Pipeline Proof — Phase File (spec Sub-spec 2)

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Phases in order, inline, stop for review at each boundary. `- [ ]` checkboxes. Read [`overview.md`](./overview.md) first — its **Global Constraints** bind every step (no git steps; TDD red-green for units; pnpm; Node 24; stack versions). `content-foundation.md` must be at **exit-criteria green** before this file starts — `lib/content/` is imported here unchanged.

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
- **`basePath` / `assetPrefix`** centralised in `next.config.ts` + `lib/config.ts`. No hand-built absolute URLs anywhere — `next/link` and Next's asset handling only.
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
`node-version-file: .nvmrc` pins the exact patch (overview.md — no floating `24`). This job runs on every push/PR. It does NOT build or deploy — the `build` job is Phase 6, and there is no deploy job until the cutover.

- [ ] **Step 5: Confirm the job definition is valid**

Run: `pnpm exec eslint .github/` is not meaningful; instead validate YAML with a linter or `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"` via `.venv/bin/python3`. Expected: no parse error.

**Exit criteria:** `pnpm lint` catches a hooks violation and an a11y violation in a `.tsx` file; Biome and ESLint do not fight over style; `ci.yml` has a `frontend` job running typecheck + lint + test.

---

## Phase 2 — Next project scaffold + config

**Goal:** a Next.js App Router project configured for static export at the subpath. No routes render yet beyond a placeholder.

**Files:**
- Create: `next.config.ts` (Next 16 supports TS config natively — import `lib/config.ts` directly, no literal duplication), `lib/config.ts`, `scripts/build-content.mjs`
- Modify: `package.json` (Next dep + `dev`/`build`/`start`/`content:build` scripts), `tsconfig.json` (Next plugin), `.gitignore` (`next-env.d.ts`, `*.tsbuildinfo` — `.next/`, `out/`, generated dirs already covered by `content-foundation.md` Phase 0)
- Create: `app/layout.tsx` (minimal), `app/page.tsx` (placeholder)
- Note: `next-env.d.ts` is generated by `next build` and git-ignored (Next docs recommendation)

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

- [ ] **Step 3: Create `next.config.ts`**

```ts
import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/config";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  agentRules: false, // stop `next dev` re-injecting its agent-rules block into CLAUDE.md
};

export default nextConfig;
```
`images.unoptimized` is required for `output: 'export'`. Next 16 runs `next.config.ts` natively (no `.mjs`/literal-string workaround needed) — import `lib/config.ts` directly so `BASE_PATH` has one home. `agentRules: false` because Next 16's `next dev` otherwise appends a "This is NOT the Next.js you know" block to `CLAUDE.md` on every run.

- [ ] **Step 4: Add Next scripts to `package.json`**

```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"content:build": "tsx scripts/build-content.mjs"
```
Keep the existing `test`/`typecheck`/`lint`/`format` from `content-foundation.md` Phase 0. `content:build` replaces the old `vitest run lib/content/build.test.ts` wrapper (Step 9a decision). `scripts/build-content.mjs` is two lines: `import { buildContent } from "../lib/content/index.ts"; await buildContent();` — `tsx` resolves `lib/content`'s extensionless imports.

- [ ] **Step 5: Update `tsconfig.json` for Next**

Add the Next plugin and JSX settings:
```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "allowJs": true,
    "incremental": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["lib/**/*", "tests/**/*", "app/**/*", "components/**/*", "*.config.ts", "next-env.d.ts", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"]
}
```
Merge with the existing config from `content-foundation.md` — do not drop `strict`, `noUncheckedIndexedAccess`, the `js/**` exclude, or the `@/*` path alias. Note: `next build` rewrites this file on first run — it forces `jsx: "react-jsx"` (automatic runtime), sets `isolatedModules: true`, and adds `.next/dev/types`. Those are mandatory Next 16 values; accept them (verified: `lib/**` typecheck + the 134-test Vitest suite stay green with `react-jsx`).

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

Run: `pnpm content:build && pnpm build`
Expected: `next build` succeeds, `out/` created with `out/index.html` (files land flat in `out/`, NOT under `out/wiki-fe/` — Next 16 static export does not nest under `basePath`; GitHub Pages serves the repo artifact at the `/wiki-fe/` path segment, and `assetPrefix` makes the emitted HTML reference `/wiki-fe/_next/...` which matches). Open `out/index.html` locally — it should say "skeleton"; confirm its asset `src`/`href` are all `/wiki-fe/_next/...`.

- [ ] **Step 8: Run typecheck + lint on the new files**

Run: `pnpm typecheck && pnpm lint`
Expected: green.

**Exit criteria:** `pnpm content:build && pnpm build` emits a static flat `out/` whose HTML references assets at `/wiki-fe/_next/...`. `pnpm dev` serves the placeholder at `http://localhost:3000/wiki-fe` (and `/wiki-fe/`); `http://localhost:3000/` is 404 (basePath enforced). typecheck + lint green.

---

## Phase 3 — CSS port

**Goal:** `css/**` served by the Next app, cascade intact, `tokens.css` unchanged bar an appended `--diagram-*` block + a Shiki dark-activation rule in `code.css`, both needed downstream.

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

Append to the `:root` block. Because `themes.css` computes background presets in JS (not named `data-theme` blocks), and the light/dark palettes are all token-derived, mapping `--diagram-*` to existing tokens gives correct values in **both** themes automatically:
```css
  --diagram-bg: var(--surface);
  --diagram-text: var(--text-body);
  --diagram-node-fill: var(--surface-2);
  --diagram-node-stroke: var(--border-2);
  --diagram-edge: var(--text-muted);
  --diagram-cluster-fill: var(--surface-3);
  --diagram-cluster-stroke: var(--border);
```
Values map to existing tokens — this is wiring, not new design. **The Mermaid client island (`cutover.md` Phase 3) reads these via `getComputedStyle(document.documentElement)` and passes them to `mermaid.initialize({ themeVariables })`**, then re-runs on theme change — per `mermaid-spike-result.md` (build-time SVG theming was NOT clean; client re-render is the path). Confirm every `--diagram-*` resolves to a concrete colour (not another unresolved `var()`) in both light and dark by checking `getComputedStyle` in DevTools after Step 2.

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
Static export emits this as `out/404.html` (served at `/wiki-fe/` anything-unmatched by GitHub Pages; spec §4). Note: the vanilla `404.html` at repo root is separate and stays until `cutover.md`.

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

- [ ] **Step 9a: Publish the build-time generated JSON as static assets**

`content-foundation.md`'s `buildContent()` writes `search-index.json`, `backlinks.json`, `broken-links.json`, `bridges.json`, `previews.json`, `complexity-tables.json` to `lib/content/generated/` (server-readable). The client islands (`cutover.md` search, hover-previews; `post-cutover.md` comparator, admin) need the six browser-facing files served under `/wiki-fe/data/`.

**Decision (2026-09-03, discussed):** `lib/content` stays framework-agnostic — `buildContent()` writes only its own `lib/content/generated/*.json` (all eight, unchanged; signed-off `build.test.ts` untouched). The app-layer glue that places the six browser-facing files into `public/data/` lives in `scripts/build-content.mjs` (plain-Node `copyFileSync` after `buildContent()` returns). No separate `prebuild` npm hook. `manifest.json` stays `generated/`-only (large; RSC reads it off disk directly).

The `content:build` script is a real standalone build, not the `vitest run build.test.ts` wrapper: `"content:build": "tsx scripts/build-content.mjs"` — imports `buildContent` from `lib/content`, runs it, then copies the six files to `public/data/`. `tsx` resolves `lib/content`'s extensionless TS imports (bare `node` cannot; `moduleResolution: "Bundler"`). `tsx` is a dev dep. No `dist/` compile of `lib/content` — one app, one consumer.

CI and local: `pnpm content:build && pnpm build` — two explicit steps, `content:build` first so `generated/` + `public/data/` exist before `next build` reads them. `next.config.ts` stays static (no async side-effects). `pnpm dev` reads `generated/` if present; re-run `content:build` after editing content.

Confirm `pnpm build` produces `out/data/search-index.json` etc. (flat `out/`, served at `/wiki-fe/data/...`). `public/data/` + `lib/content/generated/` are already git-ignored (`content-foundation.md` Phase 0).

- [ ] **Step 10: Build the whole tree**

Run: `pnpm build`
Expected: `out/` (flat) contains `index.html`, `dsa/index.html`, `system-design/index.html`, and an `index.html` for every article under each vertical, plus `404.html`. The article HTML count should equal `getArticleSlugs().length` from `content-foundation.md` — assert that, don't hardcode a number.

- [ ] **Step 11: Local visual check**

`pnpm dev`, open `/wiki-fe`, click into a vertical, click into an article. The article body renders with headings, code (Shiki-highlighted), tables, callouts, math (KaTeX). Diagrams: `mermaid-spike-result.md` = NOT CLEANLY GREEN → the pipeline emits `<pre class="mermaid">` with raw source; at this phase it shows as **unstyled source text** (the render island is `cutover.md` Phase 3). Expected — confirm the `<pre class="mermaid" data-mermaid-src>` element is present in the HTML. This is a genuine visual check — allowed (memory `feedback-visual-companion-use`).

- [ ] **Step 12: typecheck + lint + test**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

**Exit criteria:** all three route levels render from `lib/content`. `pnpm build` emits one page per article (count = `getArticleSlugs().length`) + 2 index pages + home + `404.html`, flat in `out/`. Article HTML is real, server-rendered, styled. No interactivity (expected). typecheck + lint + test green.

---

## Phase 5 — PWA wiring (Serwist CLI, post-build)

**Goal:** the offline model from spec §8 — shell precache + runtime article caching — with a service worker generated by `@serwist/cli` **against `out/` after `next build`**. No save/evict UI (that is `cutover.md`), but the SW is installed, scoped, and caching.

**Decision (2026-09-06, executed):** the plan assumed `@serwist/next` (`withSerwistInit` wrapping the config). It does not work here:
- `@serwist/next` 9.x is a **webpack plugin**; Next 16's `next build` defaults to **Turbopack**, which ignores the webpack-config hook → no SW.
- Serwist's Turbopack path (`@serwist/turbopack`) needs a **Route Handler** to serve the SW — `output: 'export'` forbids route handlers.
- Forcing `next build --webpack` works but opts the whole build out of Turbopack.

Instead: **`@serwist/cli build`** — a standalone Node CLI (adapted from `workbox-cli`) that scans a `globDirectory` (`out/`), injects a precache manifest into a SW source file, and bundles it with esbuild. Framework-agnostic, runs post-build, no plugin. Cleaner for static export and decoupled from the framework build (survives a Next major bump).

**Files:**
- Create: `app/sw.ts` — the Serwist SW source (`self.__SW_MANIFEST` injection point)
- Create: `serwist.config.js` — `@serwist/cli build` config: `swSrc`, `swDest: "out/sw.js"`, `globDirectory: "out"`, shell-only `globPatterns`, `modifyURLPrefix: { "": "/wiki-fe/" }`
- Create: `tsconfig.sw.json` — WebWorker lib for typechecking `app/sw.ts` (excluded from the main tsconfig; esbuild compiles it at `sw:build`)
- Create: `app/offline/page.tsx` — offline fallback route (replaces `OFFLINE_FALLBACK_MD`)
- Create: `public/manifest.webmanifest`, `public/icon.svg`, `public/icons/**` (copied from repo root; deduped at cutover when the vanilla app's copies are deleted)
- Modify: `app/layout.tsx` — `manifest` + `icons` metadata, `themeColor` via `viewport` export (SW registration already added in Phase 4)
- Modify: `package.json` — `sw:build` script, `build` = `next build && pnpm sw:build`, `typecheck` also runs `-p tsconfig.sw.json`
- Modify: `eslint.config.js` — dedicated `app/sw.ts` block pointing at `tsconfig.sw.json`
- Modify: `next.config.ts` — **not touched** (no `withSerwist` wrapper)
- Create: `app/sw.test.ts` — assert the precache scope (shell only, article runtime rule present)

- [ ] **Step 1: Confirm Serwist maintained** — `@serwist/cli` / `serwist` latest 9.5.12, published 2026-07-22 (~6 weeks before execution), v10 in preview. Actively maintained.

- [ ] **Step 2: Install** — `pnpm add -D serwist @serwist/cli` (pin exact). Not `@serwist/next`.

- [ ] **Step 3: `serwist.config.js`**

```js
/** @type {import("@serwist/cli").BuildOptions} */
export default {
  swSrc: "app/sw.ts",
  swDest: "out/sw.js",
  globDirectory: "out",
  globPatterns: [
    "_next/static/**/*.{js,css,woff,woff2}",
    "index.html", "dsa/index.html", "system-design/index.html", "offline/index.html",
    "manifest.webmanifest", "icon.svg", "icons/**/*.{png,svg}",
  ],
  modifyURLPrefix: { "": "/wiki-fe/" },
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
};
```
`globPatterns` is shell only — article HTML and `data/*.json` are deliberately excluded (runtime-cached). `modifyURLPrefix` rewrites every precache key to `/wiki-fe/...` because `out/` is flat but served under the subpath.

- [ ] **Step 4: Write `app/sw.ts` — the offline model from spec §8**

```ts
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const ARTICLE_RE = /\/wiki-fe\/(dsa|system-design)\/.+/;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    { matcher: ({ url }) => ARTICLE_RE.test(url.pathname), handler: new StaleWhileRevalidate({ cacheName: "wiki-articles" }) },
    { matcher: ({ url }) => url.pathname.startsWith("/wiki-fe/data/"), handler: new StaleWhileRevalidate({ cacheName: "wiki-data" }) },
  ],
  fallbacks: {
    entries: [{ url: "/wiki-fe/offline/", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
```
Core `serwist` `RuntimeCaching.handler` wants a **Strategy instance** (`new StaleWhileRevalidate(...)`), not a Workbox-style string — that string form is only in `@serwist/next/worker`'s `defaultCache`, which we don't use. No `defaultCache` spread. Spec §8 points enforced: shell precache excludes article bodies; articles runtime-cache on visit; uncached article offline → `/offline/`. Explicit save/evict is a `cutover.md` island writing into `wiki-articles`.

**Mermaid chunk (spike fallback, `mermaid-spike-result.md`):** `cutover.md` adds `mermaid` as a client dep, dynamically imported by `MermaidDiagrams`. Its hashed chunk lands in `out/_next/static/chunks/`, so `globPatterns`' `_next/static/**` picks it up into the precache — large (~800 KB gzipped) but one-time, and diagram pages then work offline. If precache size becomes a problem, revisit in `cutover.md`: drop the chunk from `globPatterns` and add a `CacheFirst` runtime rule so it is fetched on the first diagram page instead.

- [ ] **Step 5: `tsconfig.sw.json` + typecheck/lint wiring** — `app/sw.ts` needs `lib: ["ESNext","WebWorker"]` (conflicts with the app's `DOM`). Give it its own tsconfig, exclude `app/sw.ts` from the main one, run both in `pnpm typecheck`. In `eslint.config.js` add an `app/sw.ts` block with `parserOptions.project: "./tsconfig.sw.json"` and `ignores: ["app/sw.ts"]` on the main typed + react blocks.

- [ ] **Step 6: `app/sw.test.ts` — precache scope**

Static check on `app/sw.ts` + `serwist.config.js`: `precacheEntries` is `self.__SW_MANIFEST` (never a hard-coded array or article path); the article runtime rule covers `/dsa/` + `/system-design/`; the offline fallback is present; `serwist.config.js` globs `index.html` / `dsa/index.html` but not `dsa/**` or `**/*.html`, and has `modifyURLPrefix`. Guards spec §8 "small shell, not the whole site". Run, confirm pass.

- [ ] **Step 7: `app/offline/page.tsx`** — `content-layout` / `content-main` / `markdown-body` structure (matching the article route), same copy as the old `OFFLINE_FALLBACK_MD`.

- [ ] **Step 8: `public/manifest.webmanifest`** — port `manifest.json`: `id`/`start_url`/`scope` = `/wiki-fe/`; shortcut URLs `#system-design` → `/wiki-fe/system-design/`, `#dsa` → `/wiki-fe/dsa/`, search → `/wiki-fe/` (search is a `cutover.md` island); icon `src` → `/wiki-fe/icon.svg`, `/wiki-fe/icons/*.png`. Copy `icon.svg` + `icons/**` into `public/` (root copies stay for the vanilla app; deduped at cutover). Reference in `layout.tsx` metadata `manifest` + `icons`.

- [ ] **Step 9: Build + inspect the SW** — `pnpm content:build && pnpm build` (build now chains `next build && pnpm sw:build`). Inspect `out/sw.js`: precache manifest lists `_next/static/**` + the 4 shell HTML pages + webmanifest + icons, all `/wiki-fe/`-prefixed, and **no** individual article HTML. `serwist build` prints the count + total size.

- [ ] **Step 10: Local SW serve check** — serve `out/` under `/wiki-fe/` (symlink `out` → `wiki-fe/` in a scratch dir, `npx serve`). Confirm `sw.js` 200 `application/javascript`, `manifest.webmanifest` 200, `/offline/` 200, icons 200, registration script + `manifest` link + `theme-color` in the home HTML. Full register/cache/offline-fallback behaviour needs a browser (playwright) — the manifest scope is verified statically in Step 6 + Step 9.

- [ ] **Step 11: typecheck + lint + test** — `pnpm typecheck && pnpm lint && pnpm test`

**Exit criteria:** SW registers at scope `/wiki-fe/`, precaches the shell only (verified: no article bodies), runtime-caches articles on visit, falls back to `/offline/` for uncached articles offline. Web app manifest ported with subpath URLs. `data/*.json` runtime-cached. Tests green.

---

## Phase 6 — CI `build` job + local build verification (no deploy)

**Goal:** a CI job that builds the static site end to end (content pipeline + link-check gate) and a **local** verification that the static `out/` works under the subpath. **No remote deploy in this phase** — single-person repo, one `github.io` site, a staging deploy would only overwrite the live vanilla app. The first real Pages deploy is `cutover.md` Phase 14.

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
      - name: Build content pipeline
        run: pnpm content:build
      - name: Build static site
        run: pnpm build
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: out
          path: out
```
`pnpm content:build` (the `tsx scripts/build-content.mjs` standalone) runs first so `lib/content/generated/` + `public/data/` exist before `next build` reads them (Step 9a decision — no `prebuild` hook, `next.config.ts` stays static).
`needs: [frontend]` — build only runs if typecheck + lint + test passed. The link-check gate (`validateLinks` from `content-foundation.md`) runs inside `pnpm content:build` via `buildContent()` — a broken cross-link fails the build. The artifact is uploaded so the e2e jobs (later) can run against it; **it is not deployed anywhere**. **No Chromium / `playwright install` step** — `mermaid-spike-result.md` recorded the client-island fallback, so there is no build-time diagram render.

- [ ] **Step 2: Local production build + serve**

Run: `pnpm build` then serve the output — `npx serve out` (or `python3 -m http.server` from inside `out/`). Open the URL at the `/wiki-fe/` path.

- [ ] **Step 3: Verify against the local build**

- `/wiki-fe/` loads, both vertical cards render
- click into `dsa` — index renders, sections + article links
- click into an article — real HTML, styled, Shiki code, KaTeX math; Mermaid blocks appear as raw `<pre class="mermaid">` source (render island is `cutover.md`)
- every asset loads (Network tab, no 404 — the `basePath` / `assetPrefix` proof, spec §12 risk)
- SW registers at `/wiki-fe/` scope (SW needs `localhost` or HTTPS — `npx serve` on localhost is fine)
- `/wiki-fe/nonexistent/` serves the `404.html`
- each page has a correct `<title>` in the browser tab

This is a genuine visual/behavioural check — allowed (memory `feedback-visual-companion-use`).

**Exit criteria:** CI `frontend` → `build` green (build + link-check, no deploy). The local production build renders every route correctly under `/wiki-fe/`; `basePath` / `assetPrefix` / SW-scope all verified against the served `out/`. Article HTML renders correctly (Mermaid as raw source, island pending). No SEO check. Vanilla app untouched and still serving.

---

## Phase 7 — Full-corpus build benchmark (spec §5 "prove riskiest infra")

**Goal:** measure `next build` wall-clock and memory over the whole corpus once, locally, and record a ceiling. No build-time diagram render (client-island fallback, `mermaid-spike-result.md`) — the cost being measured is the `unified` pipeline + Shiki + KaTeX + `generateStaticParams` over ~176 articles, and Next's page emit.

**Files:**
- Create: `docs/_meta/plans/nextjs-migration/build-benchmark.md`

- [ ] **Step 1: Clean build, timed**

Run: `rm -rf .next out lib/content/generated public/data && time (pnpm content:build && pnpm build)`
Record: total wall-clock (both steps), the `content:build` vs `next build` split, and if the machine allows, peak RSS (`/usr/bin/time -l` on macOS, wrapped around each step).

- [ ] **Step 2: Warm build, timed**

Run: `time (pnpm content:build && pnpm build)` again (`.next` cache warm, `generated/` + `public/data/` freshly rewritten). Record the delta — this is what an incremental CI build costs.

- [ ] **Step 3: Identify the dominant cost** — from the build log / a simple timer around `buildContent()` vs Next's page emit, note which dominates (Shiki highlighting is usually the biggest single item; it can be cached).

- [ ] **Step 4: Record `build-benchmark.md`**

- cold build: Xs, peak RSS Y MB
- warm build: Xs
- article count: N (from `getArticleSlugs().length`)
- dominant cost: (Shiki / KaTeX / pipeline / Next emit)
- **ceiling:** if a cold CI build exceeds ~8 min or the runner OOMs (2 vCPU / 7 GB), revisit — options: Shiki highlight cache, shard `generateStaticParams`, or cache `lib/content/generated/` between runs.

- [ ] **Step 5: If the cold build is already near the ceiling** — flag it now, before `cutover.md`. The fix (a Shiki cache or generated-dir cache) is small and belongs here, not discovered mid-cutover.

**Exit criteria:** `build-benchmark.md` records cold + warm build cost and a documented ceiling. If near the ceiling, mitigation identified.

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

**Executed 2026-09-06:** Origin confirmed via `gh api repos/Mshardul/wiki-fe/pages` → `html_url: https://mshardul.github.io/wiki-fe/`, `cname: null`, `status: built`. **Unchanged** — same origin the live vanilla app calls from. `wiki-be` `app/main.py` uses `allow_origins=[settings.FRONTEND_URL]` (exact single origin); prod `FRONTEND_URL` is `sync: false` (Render dashboard), but the live app calling `wiki-be.onrender.com` successfully today proves it is `https://mshardul.github.io`. **No CORS change needed. Not a cutover blocker.** Ticket filed: **WIKI-BE-58** (`docs/tickets.md`, Backlog, chore, `core | security`) — records the verification + defers "server-to-server auth for a future BFF/SSR layer".

**Exit criteria:** the `wiki-be` ticket is filed. The production origin is confirmed against the real Pages URL. If CORS needs a change, it is called out as a cutover blocker. — **all met; no blocker.**

---

## Phase 9 — Sub-spec 2 exit gate

**Files:**
- Create: `docs/_meta/plans/nextjs-migration/sub-spec-2-exit.md`

- [ ] **Step 1: Fill the exit checklist against spec §5 Sub-spec 2 exit criteria**
  - local production build renders every route correctly under `/wiki-fe/` ✅/❌
  - `basePath` / asset / SW-scope verified against the served `out/` ✅/❌
  - article HTML renders correctly (Mermaid as raw `<pre class="mermaid">` source — render island is `cutover.md`) ✅/❌
  - full-corpus build time recorded, ceiling documented ✅/❌ + link to `build-benchmark.md`
  - CI `frontend` + `build` jobs green (no deploy job) ✅/❌ + run link
  - `wiki-be` CORS confirmed; ticket filed ✅/❌ + ticket id
  - vanilla app unaffected — `index.html` + `js/**` + `wiki-sw.js` byte-unchanged, still serving ✅/❌

- [ ] **Step 2: Full local check** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, all green.

- [ ] **Step 3: Checkpoint** — report. Do not start `cutover.md` until reviewed. `cutover.md` is the atomic replacement; it must not begin on a shaky skeleton.

**Exit criteria:** `sub-spec-2-exit.md` all ✅ (or ❌ with accepted-tradeoff notes). The skeleton is a proven, benchmarked base verified locally. `lib/content`'s public surface is confirmed sufficient for real routes. The `wiki-be` ticket is filed.
