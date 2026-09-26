# Cutover-Critical App — Atomic Replacement — Phase File (spec Sub-spec 3)

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Phases in order, inline, **stop for review at every phase boundary** — this file is large and the user reviews between phases (spec §12). `- [ ]` checkboxes. Read [`overview.md`](./overview.md) first — **Global Constraints** bind every step (no git steps; TDD red-green for units; pnpm; stack versions; drop list). `app-skeleton.md` must be at **exit-criteria green** before this file starts.

**Maps to:** spec [`../nextjs-migration-design.md`](../nextjs-migration-design.md) §5 Sub-spec 3, §4, §8, §9.

**Deliverable:** the reduced-but-complete app. When the last phase ships, `index.html` + `js/**` + `wiki-sw.js` are **deleted in the same change**. No dual router, no dual service worker. The live site becomes the Next app, missing only the six features deferred to `post-cutover.md`.

**In scope (the cutover-critical set — spec §5 Sub-spec 3 "In scope" is authoritative):** reader (all content islands), home + index, routing, search, auth UI, `lib/api.ts`, synced domains, settings, per-article local prefs, mobile, core chrome, PWA save/evict.

**Deferred to `post-cutover.md` (absent from the live site during the gap — accepted, no production users):** progress dashboard view, admin view, changelog view, per-article highlights + inline markers, per-article notes scratchpad, complexity-comparator modal.

**Dropped — no steps anywhere in this file (spec §5, §9):** quiz-me table mode, home parallax, study-feedback (haptic/tone), `?debug` overlay, freeze-frame export, all three node-graph overlays + `graph-engine`. The "Mentioned by" backlink spine **is kept** (text panel).

---

## Interfaces consumed from earlier phase files

```ts
import {
  getVerticals, getVertical, getArticleSlugs, getArticle,
  getManifest, getVerticalIndex, getBacklinks, getRelated,
} from "@/lib/content";
import { BASE_PATH, CANONICAL_BASE } from "@/lib/config";
```

## Interfaces this phase file produces

```ts
// lib/api.ts — single typed wiki-be client (ported from js/api.js)
export class ApiError extends Error { code: string; status: number; requestId?: string; }
export const api: {
  auth: { me(): Promise<MeResponse>; login(...): Promise<...>; register(...): Promise<...>;
          verifyEmail(...): Promise<...>; logout(): Promise<void>; resendVerification(...): Promise<...>; };
  bookmarks: { list(): Promise<Bookmark[]>; add(b): Promise<void>; remove(id): Promise<void>; };
  recents: { list(): Promise<Recent[]>; push(r): Promise<void>; };
  readTracking: { list(): Promise<ReadEntry[]>; mark(path, state): Promise<void>; };
  completions: { list(wikiId): Promise<string[]>; set(wikiId, path, done): Promise<void>; };
};
export function getSessionToken(): string | null;
export function setSessionToken(t: string | null): void;

// lib/storage/* — localStorage domains + cache-through sync
// components/* — per-feature client islands (folder list settled in Phase 1)
```

---

## Global constraints specific to this phase file

- **The island rule (overview.md "The island rule"):** markup comes from the build pipeline — an island never re-parses markdown and never re-renders the article body. Behaviour lives in React and works with React-rendered controls **where possible** (TOC, search, tabs, callout collapse, code-copy, table sort render their own UI and only read the body or toggle classes/attributes on it — no hydration fight). Direct DOM mutation of the body is reserved for the cases that genuinely need it — Range-based highlight wrapping and marker insertion at text offsets (`post-cutover.md` Phase 1).
- **`lib/api.ts` is client-direct** — no BFF, no route handlers (spec §2 keeps that fork open by keeping `lib/api` framework-agnostic; do not couple it to Next).
- **Cache-through preserved** (spec §5): local read path first, API is the durable store, writes are fire-and-forget, graceful degradation when offline or BE is down.
- **`output: 'export'`** still holds — every island hydrates client-side; no server code.
- **Faithful port** — reuse the existing CSS class names and DOM structure the islands target. UI/UX revamp is separate (memory `project-icon-library`).
- **Comments one line; no ticket IDs; no `console.*`** (memories + repo rules).
- **`data/*.json`** loaded via `fetch` from `public/data/` behind a typed loader (spec §13 decision).

---

## Phase 1 — `components/` shape + core chrome + modal + toast + storage foundation

**Goal:** lock the island directory structure, stand up the shared primitives every later island needs (modal registry, toast, focus-trap, storage domains, the typed `data/*.json` loader), and the core chrome (topbar, icon tooltips).

**Files:**
- Create: `CONVENTIONS.md` addition — the `components/` folder rule (per-feature + `components/common/`)
- Create: `components/common/Modal.tsx`, `components/common/useFocusTrap.ts`, `components/common/modalRegistry.ts`
- Create: `components/chrome/Topbar.tsx`, `components/chrome/ToastHost.tsx`, `components/chrome/IconTooltip.tsx`, `lib/toast.ts`
- Create: `lib/storage/` — `keys.ts`, `local.ts` (typed get/set/subscribe over localStorage), `data-json.ts` (typed `public/data/` loader), plus one module per synced domain (Phase 5 fills the sync half)
- Modify: `app/layout.tsx` — mount `<Topbar />` + `<ToastHost />`
- Tests: co-located `*.test.ts(x)`

- [x] **Step 1: Record the `components/` folder rule in `CONVENTIONS.md`**

Add a short section: per-feature folders (`components/<feature>/`), one folder per runtime island from spec §5; shared shells in `components/common/`; chrome in `components/chrome/`. List the planned folders:
```
components/
  common/     Modal, useFocusTrap, modalRegistry, Portal
  chrome/     Topbar, ToastHost, IconTooltip, ScrollToTop, Breadcrumb, WikiSwitcher
  reader/     Toc, ProgressRing, StickyHeader, HeadingCollapse, HoverPreview, PrereqStatus,
              RelatedArticles, MentionedBy, CalloutCollapse, AnchorScroll, LatexToggle,
              TabbedCode, ArticleFind, GlossaryPopover, CaveatReveal, CodeCopy, LineNumbers,
              ComparisonTable, ZoomLightbox, ReadTracker, StubTreatment, FocusMode
  home/       WikiCards, IndexSections, IndexCardSwipe, PullToRefresh, KeyNav, LearningPathBars
  search/     SearchModal, useSearchIndex
  auth/       AuthModal, PasswordChecklist
  settings/   PreferencesModal, ThemeControls, DistractionFree, PrintTrigger, ClearData
  sync/       (hooks, not visual)
  mobile/     TocDrawer, SwipeGestures, PanelCloseRegistry, ViewportHandler
  pwa/        SaveOffline, InstallPrompt, IosNudge
```
`components/chrome/` also holds `WikiSwitcher` (the vertical-switcher modal, ported from `js/app/wiki-switcher.js`) and `ScrollToTop` (ported from `js/app.js`). This is the spec §13 decision, made concrete.

- [x] **Step 2: Failing test — `modalRegistry` open-state + escape ordering**

`components/common/modalRegistry.test.ts` — register two mock modals, assert `closeTopmost()` closes the last-opened first, `anyOpen()` reflects state. Port the contract from `js/modal-registry.js` + the escape-key ordering in `js/app/mobile-panels.js` `closeTopmost`.

- [x] **Step 3: Run, confirm failure.**

- [x] **Step 4: Implement `modalRegistry.ts` + `useFocusTrap.ts` + `Modal.tsx`**

`modalRegistry.ts` — a module-level stack of `{ isOpen, close }`, `registerModal`, `closeTopmost`, `anyOpen`. `useFocusTrap.ts` — port `createFocusTrap` / `getFocusableIn` from `js/modal-registry.js` as a hook. `Modal.tsx` — a portal-based dialog using both, `lockBodyScroll` on open (port from `js/state.js`).

- [x] **Step 5: Run, confirm pass.**

- [x] **Step 6: Failing test — `lib/toast.ts` queue**

Port the queue semantics from `js/render/toast.js` (FIFO, dedupe, timeout, variant, priority arg). Test: enqueue 3, assert order + dedupe.

- [x] **Step 7: Run, confirm failure, implement `lib/toast.ts` + `ToastHost.tsx`, run, confirm pass.**

- [x] **Step 8: Failing test — `lib/storage/local.ts` typed store + subscribe**

Test: `set(key, value)` round-trips through `localStorage`, `subscribe(key, cb)` fires on same-tab set AND on a synthetic `storage` event (multi-tab). Wrap every read/write in try/catch (private-mode safety). Port the multi-tab `storage` listener pattern from `js/storage/settings-theme.js` and `js/storage/bookmarks.js`.

- [x] **Step 9: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 10: Failing test — `lib/storage/data-json.ts`**

Test: `loadDataJson("glossary")` fetches `${BASE_PATH}/data/glossary.json`, validates against a zod schema, caches the result, returns `{}` (not throw) on fetch failure. One schema per file: hand-authored `glossary`, `synonyms`, `shortcuts`, `summaries`; build-generated `search-index`, `backlinks`, `previews`, `complexity-tables` (the last two consumed in later phases / `post-cutover.md` — register the schemas now).

- [x] **Step 11: Run, confirm failure. Move `data/*.json` to `public/data/`, implement the loader, run, confirm pass.**

- [x] **Step 12: Implement the chrome — `Topbar.tsx`, `IconTooltip.tsx`**

`Topbar.tsx` — port the topbar structure from `index.html` + `css/components/topbar.css`: breadcrumb slot, back button, title slot, icon-button row (search trigger, bookmarks trigger, settings trigger — the triggers dispatch to islands mounted later; wire as they land). `IconTooltip.tsx` — port `js/app/icon-tooltip.js` (short-delay custom tooltip, keeps native `title` fallback). Mount both in `app/layout.tsx`.

- [x] **Step 13: Failing test — breadcrumb + page title from route**

`components/chrome/Breadcrumb.tsx` — derives crumb trail + `document.title` from the current pathname (`usePathname`). Test: `/dsa/patterns/sliding-window` → crumbs `["DSA", "Patterns", "Sliding Window"]`, title `"Sliding Window · DSA · Wiki"`. Port `updatePageTitle` + breadcrumb logic from `js/render/nav-utils.js`.

- [x] **Step 14: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 15: `WikiSwitcher` + `ScrollToTop`**

`WikiSwitcher.tsx` — port `js/app/wiki-switcher.js` (modal listing verticals, keyboard-navigable, navigates on select). `ScrollToTop.tsx` — port the scroll-to-top button from `js/app.js` (appears past a scroll threshold). Both use `Modal` / `registerModal` where applicable. Failing test each → implement → pass.

- [x] **Step 16: typecheck + lint + test.**

**Exit criteria:** `components/` structure recorded in `CONVENTIONS.md`. Modal registry, focus-trap, toast, typed local storage, typed `data/*.json` loader, topbar, icon tooltips, breadcrumb, wiki-switcher, scroll-to-top — all built, tested, mounted. `data/*.json` served from `public/data/`. No feature islands yet.

---

## Phase 2 — Reader islands, part 1: TOC, progress, sticky header, heading collapse, anchors, focus mode

**Goal:** the article-page navigation furniture. All islands mount onto the RSC-rendered `.markdown-body` and its `.section` wrappers (produced by `remark-section-wrap` in `content-foundation.md`).

**Files:**
- Create: `components/reader/Toc.tsx`, `ProgressRing.tsx`, `StickyHeader.tsx`, `HeadingCollapse.tsx`, `AnchorScroll.tsx`, `FocusMode.tsx`
- Create: `components/reader/ReaderIslands.tsx` — one client wrapper the article page mounts, that composes the reader islands (keeps `app/[vertical]/[...slug]/page.tsx` a thin server component)
- Modify: `app/[vertical]/[...slug]/page.tsx` — render `<ReaderIslands article={...} />` after the article HTML
- Tests: co-located

- [x] **Step 1: Failing test — `Toc` builds from `article.headings`**

`Toc` takes `article.headings` (from `getArticle`) as a prop and renders a nested `<nav>` with `#id` links — no DOM walk, unlike `js/content/toc.js` `buildTOC`. Test: given a headings array, renders the nested nav, depth-nested.

- [x] **Step 2: Run, confirm failure, implement `Toc.tsx`, run, confirm pass.**

- [x] **Step 3: Failing test — `ProgressRing` reflects scroll fraction**

Port `js/app/reading-progress.js` — a scroll listener computing `scrollTop / (scrollHeight - clientHeight)`, driving a ring stroke-dashoffset + the linear `#reading-progress` bar. Test with a mocked scroll container: 0% at top, ~100% at bottom.

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: Failing test — `StickyHeader` shows the current section**

Port `addStickySection` / `cleanupStickySection` from `js/content/toc.js` — an IntersectionObserver over `.section > h2` that updates a sticky label with the section currently in view. Test: scroll past section 2's heading → label reads section 2.

- [x] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 7: Failing test — `HeadingCollapse` toggles a section body**

Port `injectHeadingCollapseToggles` from `js/content/toc.js` + the per-heading collapse from `js/content/formatting.js`. Adds a toggle button per `h2`/`h3`, collapses the following `.section-body` / `.subsection-body`, persists collapsed state per article (`lib/storage/local.ts`, key from `js/storage/scroll-collapse.js`). Test: click toggle → body hidden + state saved; remount → stays collapsed.

- [x] **Step 8: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 9: Failing test — `AnchorScroll` smooth-scrolls to `#id` and updates URL**

Port `jumpToHeading` from `js/content/toc.js` + `addAnchorLinks` behaviour from `js/content/formatting.js` (the anchor markup is already emitted by `rehype-autolink-headings`; this island wires click → smooth scroll + `history.pushState` the hash). Test: click an anchor → scrolls, URL hash updates.

- [x] **Step 10: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 11: Failing test — `FocusMode` dims non-central paragraphs**

Port `toggleFocusMode` / `cleanupFocusMode` from `js/content/formatting.js` — IntersectionObserver with `rootMargin: "-35% 0px -35% 0px"` toggling `.focus-para` on `FOCUS_SELECTORS` elements, `.focus-mode` on the body. Test: element in the central band gets `.focus-para`.

- [x] **Step 12: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 13: Compose in `ReaderIslands.tsx` and mount on the article page**

`ReaderIslands.tsx` (`"use client"`) takes `{ article }`, renders `<Toc>`, `<ProgressRing>`, mounts the effect-only islands (`StickyHeader`, `HeadingCollapse`, `AnchorScroll`, `FocusMode`) which operate on `document`. Article page renders it after `dangerouslySetInnerHTML`.

- [x] **Step 14: Local visual check** — open a real article, TOC populates, progress ring moves on scroll, sticky header tracks sections, headings collapse and persist, anchors scroll, focus mode dims. (Visual — allowed per memory.)

- [x] **Step 15: typecheck + lint + test.**

**Exit criteria:** article-page navigation furniture works on real content. `app/[vertical]/[...slug]/page.tsx` stays a thin server component delegating to `<ReaderIslands>`.

---

## Phase 3 — Reader islands, part 2: content-body interactions

**Goal:** the in-body interactive layer — every runtime half of the `content-foundation.md` Phase 4 plugins.

**Files:**
- Create: `components/reader/CalloutCollapse.tsx`, `LatexToggle.tsx`, `TabbedCode.tsx`, `ArticleFind.tsx`, `GlossaryPopover.tsx`, `CaveatReveal.tsx`, `CodeCopy.tsx`, `LineNumbers.tsx` (may be markup-only from the plugin — verify), `ComparisonTable.tsx`, `ZoomLightbox.tsx`, `PracticeAnswerToggle.tsx`, `PrereqStatus.tsx`, `MermaidDiagrams.tsx`
- Modify: `components/reader/ReaderIslands.tsx` — add these
- Add dep: `mermaid` (client — `pnpm add mermaid`; the spike-fallback render path, `mermaid-spike-result.md`)
- Tests: co-located, each mounting on the plugin's emitted markup

For each island: **failing test on the plugin's real emitted markup → run → implement → run → full reader suite green.** Repeat all steps per island.

- [x] **Task 3a — `CalloutCollapse`**: on `.callout[data-collapsible="true"]` (emitted by `remark-callouts`), wire a header click to expand/collapse. Port from `js/content/formatting.js` `addCollapsibleCallouts`. Test: click collapsed callout header → body shows.

- [x] **Task 3b — `LatexToggle`**: on KaTeX `.katex` blocks, add the `αβ` button that swaps rendered LaTeX between original and variable-name-substituted form, plus a copy-LaTeX button. Port `_substituteLatex`, `VAR_MAP`, `_katexToolbar` from `js/content/formatting.js`. Needs `katex` client-side for `renderToString` on toggle — lazy-import it only when a toggle is clicked (not in the initial bundle). Test: click `αβ` → re-rendered with `\text{...}`.

- [x] **Task 3c — `TabbedCode`**: on `.tabbed-code[data-tabs-id]` (emitted by `remark-tabbed-code`), wire tab buttons switching visible `<pre>`. Port `_buildTabWidget` from `js/content/formatting.js`. Test: two tabs, click tab 2 → pre 2 visible.

- [x] **Task 3d — `ArticleFind`**: the in-article find bar (`/` or a button opens it), highlights matches in `.markdown-body`, next/prev. Port `ArticleFind` from `js/content/formatting.js`. Test: type a term present in the fixture → match count > 0, `.article-find-hit` marks present.

- [x] **Task 3e — `GlossaryPopover`**: on `.glossary-term` spans (emitted by `rehype-glossary-caveat-markers`), wire hover/focus → positioned popover with the definition, click → inline expand. Port `addGlossaryTerms` / `addInlineGlossaryExpand` / `_positionPopover` from `js/content/glossary-caveats.js`. Definitions come from `loadDataJson("glossary")`. Test: hover a term → popover visible with def text.

- [x] **Task 3f — `CaveatReveal`**: on `.caveat-marker` (emitted by the same plugin), wire click/Enter → toggle `.caveat-body` visibility + `aria-expanded`. Port `addInlineCaveats` reveal half from `js/content/glossary-caveats.js`. Test: click marker → body revealed.

- [x] **Task 3g — `CodeCopy` + `LineNumbers`**: on `.code-header` copy button (emitted by `rehype-code-header`), wire clipboard write (with `execCommand` fallback) + toast. Port `writeToClipboard`, `addCopyButtons` from `js/content/code-blocks.js`. Line numbers: if `rehype-code-header` already emitted `.code-line` spans + `has-line-numbers`, this is CSS-only — verify; if the plugin left it for runtime, port `addLineNumbers`. Test: click copy → clipboard has the code text.

- [x] **Task 3h — `ComparisonTable`**: on `[data-comparison]` tables (emitted by `rehype-comparison-table`), wire column-header sort (numeric/Big-O aware), column-toggle (hidden-column prefs via `lib/storage`, key from `js/storage/table-columns.js`), and horizontal scroll cues. Port `addTableSort`, `addComparisonColumnToggles`, `addTableScrollCues` from `js/content/tables.js`. Do NOT port `addQuizTables` / `QuizMode` — quiz-me is dropped (§9). Test: click a numeric column header → rows sorted ascending; toggle a column → hidden + persisted.

- [x] **Task 3i — `ZoomLightbox`**: on `img` in `.markdown-body` and on inline diagram SVGs, wire click → full-screen overlay with pinch/pan/swipe. Port `addImageLightbox`, `addDiagramZoom`, `wireImageErrorPlaceholders` from `js/content/zoom-lightbox.js`. Test: click an image → `#zoom-overlay` visible with the image.

- [x] **Task 3j — `PracticeAnswerToggle`**: on `.problem-answer[hidden]` (emitted by `remark-practice-answer`), add the eye button toggling visibility. Port `_wireProblem` / `_setAnswerHidden` from `js/content/practice-toggle.js`, respecting the `practiceAnswersHidden` setting default. Test: click eye → answer shown, icon swaps.

- [x] **Task 3k — `PrereqStatus`**: on `.prereq-chip[data-prereq-path]` (emitted by `rehype-prerequisites`), add the completed/not class by looking up `lib/storage` completions for that path. Port `appendChipStatus` state half from `js/content/formatting.js` `renderPrerequisites`. Test: mark a prereq path complete → chip gets the done class on mount.

- [x] **Task 3l — `MermaidDiagrams`** (spike-fallback render, `mermaid-spike-result.md`): on `pre.mermaid[data-mermaid-src]` (emitted by `remark-mermaid`), render each block client-side.
  - On mount: `const mermaid = (await import("mermaid")).default;` — dynamic import so it is a separate chunk (precached as shell, `app-skeleton.md` Phase 5). Read the `--diagram-*` custom properties via `getComputedStyle(document.documentElement)`, map them to `mermaid.initialize({ startOnLoad: false, theme: "base", themeVariables: { background, primaryColor, primaryTextColor, primaryBorderColor, lineColor, secondaryColor, tertiaryColor, ... } })`, then `await mermaid.run({ nodes: [...pre.mermaid elements] })`. Mermaid replaces each `<pre>` body with an `<svg>`.
  - On theme change: re-read `--diagram-*`, `mermaid.initialize` again, restore each block's original source from `data-mermaid-src`, `mermaid.run` again. Subscribe to the same theme-change signal `ThemeControls` / `settings.ts` emits (`cutover.md` Phase 9 — this island may need a small event or a `useSettings` hook; if Phase 9 isn't done yet, listen for a `wiki:theme-changed` custom event and have Phase 9 dispatch it).
  - Parse-error handling: if `mermaid.run` throws for a block, leave the raw source visible (do not blank it) + a one-line "diagram failed to render" note. Port the spirit of `js/content/mermaid.js` error handling.
  - `js/content/mermaid.js` also had node-hover captions + a step-through walkthrough — **check** whether those are used in real content; if niche, drop them (they were decoration, and the UI/UX revamp will revisit). Keep the core render + re-theme.
  - Test (jsdom + mocked `mermaid`): a `pre.mermaid` block → `mermaid.run` called with it; a `wiki:theme-changed` event → `initialize` + `run` called again.

- [x] **Step (final): typecheck + lint + test + local visual sweep** of a content-heavy real article — every interaction works; diagrams render and re-theme on a light/dark toggle with no reload.

**Exit criteria:** the full in-body interactive layer works on real articles. Mermaid diagrams render client-side and re-theme instantly on theme change (spec §7 requirement met via the client-island path). Quiz-me explicitly absent. `ReaderIslands.tsx` composes all reader islands.

---

## Phase 4 — Reading state, stub treatment, hover previews, related + backlinks

**Goal:** the reader's stateful + cross-article layer.

**Files:**
- Create: `components/reader/ReadTracker.tsx`, `StubTreatment.tsx`, `HoverPreview.tsx`, `RelatedArticles.tsx`, `MentionedBy.tsx`, `ReadingTime.tsx`
- Create: `lib/storage/read-tracking.ts` (local half; sync half in Phase 5)
- Modify: `ReaderIslands.tsx`, article page
- Tests: co-located

- [x] **Step 1: Failing test — `ReadTracker` marks read + fades by days-since-read**

Port `js/storage/read-tracking.js` local half + the fade-by-days logic from `js/render/content-view.js` / `home-index.js`. On article mount past a scroll/time threshold → mark `{ path, readAt }`. A helper `daysSinceRead(path)` drives an opacity class on index cards. Test: mark read → `isRead` true; simulate 10 days → fade class applied.

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: Failing test — `StubTreatment`**

`article.isStub` is already known server-side. The RSC renders a stub banner when `isStub`. This island only handles the client nicety (e.g. "coming soon" badge on index cards). Port from `js/render/content-view.js` stub branch + `home-index.js` `markStubPath`. Test: stub article → banner present in RSC output (assert in the page test, not this island); index card for a stub → "Coming soon" badge.

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: Failing test — `HoverPreview` shows manifest excerpt on internal-link hover**

On `a[href^="/dsa/"]` / `a[href^="/system-design/"]` inside `.markdown-body`, hover → a positioned card with that article's `title` + `excerpt` from the manifest (`getManifest()` data passed to the client as a lookup map, or a small `public/previews.json` emitted by the build). Port `js/render/content-view.js` hover-preview wiring + `js/render/nav-utils.js` path resolution. Test: hover an internal link → preview card with the target's excerpt.

- [x] **Step 6: Run, confirm failure. Use `previews.json` — emitted by `content-foundation.md` Phase 7 Step 13a, copied to `public/` and SW-precached. Load it via `loadDataJson("previews")` (add a zod schema). Implement, run, confirm pass.**

- [x] **Step 7: Failing test — `RelatedArticles` + `MentionedBy`**

`RelatedArticles` renders `getRelated(vertical, slug)` (same-section ranking, ported `_rankRelated` — already in `lib/content` from `content-foundation.md` Phase 7). `MentionedBy` renders `getBacklinks(article.path)` as a text panel (the "Mentioned by" spine — kept, not a graph). Both can be **server-rendered** — they take no client state. Prefer rendering them in the RSC page; an island only if completion-state styling is needed. Test: article with known backlinks → panel lists them with titles + links.

- [x] **Step 8: Run, confirm failure, implement (in the RSC page where possible), run, confirm pass.**

- [x] **Step 9: `ReadingTime`** — `article.readingTimeMin` is known server-side; render it in the RSC hero. No island unless it needs live update. Add to the page component.

- [x] **Step 10: typecheck + lint + test + visual check.**

**Exit criteria:** reading state persists and fades correctly; stub treatment matches today; hover previews work from build data; related + backlinks render (server-side where possible).

---

## Phase 5 — `lib/api.ts` + synced domains + cache-through

**Goal:** the `wiki-be` client and the synced personal layer — bookmarks, recents, read-tracking, completions — with the cache-through model preserved.

**Files:**
- Create: `lib/api.ts` (ported from `js/api.js`)
- Create: `lib/storage/sync.ts` — the cache-through orchestrator (ported `Sync` from `js/storage/settings-theme.js`)
- Modify: `lib/storage/bookmarks.ts`, `recents.ts`, `read-tracking.ts`, `completions.ts` — add the sync half
- Create: `components/sync/useSession.ts`, `components/sync/useSyncedDomain.ts`
- Create: `components/chrome/BookmarksModal.tsx` — the ⌘B bookmarks modal, ported from `js/app/bookmarks-modal.js`
- Tests: co-located, mocking `fetch`

- [x] **Step 1: Failing test — `lib/api.ts` base-URL detection + `ApiError`**

```ts
import { describe, it, expect, vi } from "vitest";
import { api, ApiError } from "./api";

describe("api client", () => {
  it("targets localhost:8001 on a local host", () => { /* stub location.hostname, assert request URL */ });
  it("targets the Render URL otherwise", () => { /* ... */ });
  it("throws ApiError with code/status/requestId on a 4xx", async () => { /* mock fetch 400 */ });
  it("fires session-expired once on a 401 then suppresses", async () => { /* mock two 401s, assert one event */ });
});
```
Port constants verbatim from `js/api.js`: `BACKEND_URL = _isLocal ? "http://localhost:8001" : "https://wiki-be.onrender.com"`, `API = ${BACKEND_URL}/api/v1`, `ApiError(code, message, status, requestId)`, the `_sessionExpiredFired` guard, `getSessionToken` / `setSessionToken` (bearer token in `localStorage`).

- [x] **Step 2: Run, confirm failure.**

- [x] **Step 3: Implement `lib/api.ts`** — port `js/api.js` endpoint-for-endpoint. Typed request/response interfaces for every endpoint (`auth.me`, `auth.login`, `auth.register`, `auth.verifyEmail`, `auth.logout`, `auth.resendVerification`, `bookmarks.*`, `recents.*`, `readTracking.*`, `completions.*` — enumerate from `js/api.js`). Global 401 → dispatch a `wiki:session-expired` event + `setSessionToken(null)`. No framework coupling (spec §2).

- [x] **Step 4: Run, confirm pass.**

- [x] **Step 5: Failing test — cache-through for one domain (bookmarks)**

Contract (from spec §5, ported from `js/storage/*` + `Sync`):
- read: return the local value immediately; kick a background API refresh that updates local + notifies subscribers
- write: update local + notify synchronously; fire the API call and forget (no await in the UI path)
- offline / BE-down: local still works; queued writes retry on reconnect (or are simply best-effort — match today's behaviour, check `js/storage/settings-theme.js` `Sync`)
Test: `addBookmark` updates local synchronously; the API call is fired; a failing API call does not throw into the caller.

- [x] **Step 6: Run, confirm failure.**

- [x] **Step 7: Implement `lib/storage/sync.ts` + the sync half of each domain module** — port `Sync` (`pull`, `push`, `clearUserDataCache`, the per-domain merge on login) from `js/storage/settings-theme.js`. Each domain module (`bookmarks.ts`, `recents.ts`, `read-tracking.ts`, `completions.ts`) gets: local CRUD (Phase 1/4) + `syncPull()` + fire-and-forget `syncPush()`.

- [x] **Step 8: Run, confirm pass. Repeat Steps 5–7 for `recents`, `read-tracking`, `completions`.**

- [x] **Step 9: `useSession` + `useSyncedDomain` hooks** — `useSession` subscribes to `wiki:session-changed` / `wiki:session-expired` and the multi-tab `storage` event (port the `SESSION_SYNC_KEY` listener from `js/auth.js`), exposes `{ user, status }`. `useSyncedDomain(name)` gives a component the local value + a setter that goes through cache-through. Test both.

- [x] **Step 10: `BookmarksModal` (⌘B)** — port `js/app/bookmarks-modal.js`: modal listing bookmarks, focus trap, entry click → navigate, empty state. Reads `lib/storage/bookmarks.ts`. Failing test → implement → pass.

- [x] **Step 11: typecheck + lint + test.**

**Exit criteria:** `lib/api.ts` is a complete typed `wiki-be` client, client-direct, no Next coupling. Cache-through works for all four synced domains — local-first, fire-and-forget writes, graceful offline. Multi-tab session sync works. ⌘B bookmarks modal ported.

---

## Phase 6 — Auth UI

**Goal:** login / register / email-verify / logout, the live 5-rule password checklist, anon→logged-in migration. Ported from `js/auth.js`.

**Files:**
- Create: `components/auth/AuthModal.tsx`, `PasswordChecklist.tsx`, `lib/auth/passwordRules.ts`
- Modify: `components/chrome/Topbar.tsx` — auth button wired to open the modal
- Tests: co-located

- [x] **Step 1: Failing test — `passwordRules.ts` 5-rule validation**

```ts
import { validatePassword } from "./passwordRules";
// exact rules from js/auth.js PW_RULES:
// len >= 12, /[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/
```
Test each rule independently + the `valid` aggregate. Values copied verbatim from `js/auth.js` `PW_RULES` (labels included — "At least 12 characters", "A special character ( ! @ # $ % ^ & * ? - _ )", etc.). Keep-in-sync note pointing at `docs/_meta/auth.md` (spec / repo rule).

- [x] **Step 2: Run, confirm failure, implement `passwordRules.ts`, run, confirm pass.**

- [x] **Step 3: Failing test — `PasswordChecklist` updates live**

Renders the 5 rules, each with a pass/fail marker that updates on every keystroke. Test: type `"short"` → all fail; type `"LongEnough1!xx"` → all pass.

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: Failing test — `AuthModal` panel switching**

Panels: login, register, verify, forgot, reset (from `js/auth.js` `AuthModal._swap`). Test: open on login → click "create account" → register panel; register success → verify panel.

- [x] **Step 6: Run, confirm failure.**

- [x] **Step 7: Implement `AuthModal.tsx`** — port `js/auth.js` `AuthModal`: the five panels, `_swap`, form submit → `api.auth.*`, error rendering (map `ApiError.code` to messages as `js/auth.js` does), the `NETWORK` "Failed to fetch" special-case. Uses `Modal.tsx` + `useFocusTrap`. On login/register success: run the anon→logged-in migration.

- [x] **Step 8: Failing test — anon→logged-in migration**

On first login, local bookmarks/recents/completions created while anonymous are pushed to the API and merged (port the migration from `js/auth.js` — `flushBootMutations`, `Sync.push` per domain, `discardBootMutations` on failure). Test: seed local bookmarks anon → login → `api.bookmarks.add` called for each.

- [x] **Step 9: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 10: Wire the topbar auth button** — shows "Sign in" when out, user menu (logout) when in. `useSession` drives it. Port `Auth.refreshButtons` from `js/auth.js`.

- [x] **Step 11: typecheck + lint + test + visual check** — open modal, checklist updates live, register→verify flow, login persists across reload, logout clears.

**Exit criteria:** full auth UI ported. Password checklist matches `wiki-be`'s 5 rules exactly. Anon→logged-in migration works. Multi-tab logout catches up.

---

## Phase 7 — Search

**Goal:** ⌘K modal, client-side index from the build output, synonym expansion, fuzzy scoring, section-filter (`>`), snippet extraction, recent searches. Ported from `js/search/`.

**Files:**
- Create: `components/search/SearchModal.tsx`, `lib/search/index.ts` (index load + build from `search-index.json` / manifest), `lib/search/score.ts`, `lib/search/snippet.ts`, `lib/search/synonyms.ts`
- Create: `lib/storage/recent-searches.ts` (ported `RecentSearches` from `js/storage/scroll-collapse.js`)
- Modify: `Topbar.tsx` — search trigger; `app/layout.tsx` — mount `<SearchModal>`; keyboard shortcut (⌘K)
- Tests: co-located

- [x] **Step 1: Failing test — `score.ts` scoring ladder**

Port `scoreMatch` from `js/search/search.js` exactly: title exact=100, startsWith=90, includes=80, fuzzy=60, (not-short) desc includes=40, desc fuzzy=20, section fuzzy=10; `expandQuery` synonym expansion; the `short = ql.length <= 4` guard. Test each rung with crafted entries.

- [x] **Step 2: Run, confirm failure, implement `score.ts` + `synonyms.ts` (synonyms from `loadDataJson("synonyms")`), run, confirm pass.**

- [x] **Step 3: Failing test — `snippet.ts` sentence-based extraction**

Port `extractSnippet` / `_sentences` from `js/search/search-features.js` — pick the sentence(s) containing the most query terms, ellipsize. Test: a paragraph + a query term → snippet centred on that term.

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: Failing test — `lib/search/index.ts` builds entries from build output**

The search index is `content/search-index.json` (now Node-generated, `content-foundation.md` Phase 7) plus manifest data for sections. Test: `loadSearchEntries()` returns one entry per non-stub article with `{ title, path, slug, section, description }`.

- [x] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 7: Failing test — `SearchModal` behaviour**

Port `js/search/search.js` modal lifecycle: open (⌘K / trigger), close (Esc / backdrop), typeahead results ranked by `score.ts`, arrow-key selection wrapping to the input at the top, Enter navigates (`next/navigation` `router.push`), section-filter mode when the query starts with `>` (`section-mode` class, filters to sections), recent searches shown on empty query, remove-recent. Uses `Modal` + `registerModal`. Test: type a known article title → it ranks first; `>patterns` → section results; arrow down + Enter → navigates.

- [x] **Step 8: Run, confirm failure, implement `SearchModal.tsx`, run, confirm pass.**

- [x] **Step 9: Wire ⌘K globally** — a `keydown` listener in `app/layout.tsx` (or a `useHotkey` hook) opens the modal; respects "don't trigger while typing in an input". Port from `js/app.js` keyboard-shortcut wiring (only the search shortcut here; the full shortcut set is Phase 9).

- [x] **Step 10: typecheck + lint + test + visual check** — ⌘K opens, results rank sensibly, synonyms work ("map" finds "hash table"), `>` filters sections, recents persist.

**Exit criteria:** search fully ported, scoring ladder identical to today, synonyms + section-filter + snippets + recents all work, client-side index from the Node build output.

---

## Phase 8 — Home + index views: cards, sections, swipe, pull-to-refresh, key nav, learning-path bars

**Goal:** the home and vertical-index interactivity on top of the RSC-rendered pages from `app-skeleton.md`.

**Files:**
- Create: `components/home/IndexCardSwipe.tsx`, `PullToRefresh.tsx`, `KeyNav.tsx`, `LearningPathBars.tsx`, `RecentsStrip.tsx`, `BookmarksStrip.tsx`
- Create: `lib/content/learning-paths.ts` — parse learning-track tables (may already exist from `content-foundation.md` `getVerticalIndex`; verify — if so, reuse)
- Modify: `app/page.tsx`, `app/[vertical]/page.tsx` — mount the islands; `RecentsStrip` / `BookmarksStrip` render from `lib/storage`
- Tests: co-located

- [x] **Step 1: Failing test — `LearningPathBars` per-track completion**

`getVerticalIndex(id).learningPaths` gives tracks + rows. This island computes `completed / total` per track from `lib/storage` completions and renders a bar. Port `js/render/learning-paths.js`. Test: a track with 2 of 4 rows complete → 50% bar.

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: Failing test — `IndexCardSwipe` (mobile) bookmark/read toggle**

Port `js/render/home-gestures.js` index-card swipe: swipe-right → bookmark toggle, swipe-left → read toggle, gated to mobile viewport (`<= 900`, from `mobile-panels.js` `GESTURE_MOBILE_MAX`). Test with synthetic touch events: swipe right on a card → bookmark added.

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: Failing test — `PullToRefresh`**

Port `js/render/home-gestures.js` pull-to-refresh — at scrollTop 0, drag down past a threshold → re-fetch index data (here: revalidate `lib/storage` synced domains + re-render). Test: simulate the gesture → refresh callback fires.

- [x] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 7: Failing test — `KeyNav` arrow-key card navigation**

Port `js/render/home-index.js` key nav — arrow keys move focus between cards, Enter/Space activates, respects grid wrapping. Test: focus card 1, ArrowRight → card 2 focused.

- [x] **Step 8: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 9: `RecentsStrip` + `BookmarksStrip`** — render from `lib/storage/recents.ts` / `bookmarks.ts`, on the index view. Port the section renders from `js/storage/recents.js` / `bookmarks.js`. Client islands (need local state). Test: seed recents → strip shows them newest-first.

- [x] **Step 10: typecheck + lint + test + visual check** — home cards keyboard-navigable, index swipe works on a narrow viewport, pull-to-refresh, learning-path bars accurate, recents/bookmarks strips populate.

**Exit criteria:** home + index interactivity ported. Learning-path progress accurate. Mobile gestures gated correctly.

---

## Phase 9 — Settings, per-article local prefs, keyboard shortcuts, print

**Goal:** theme + preferences modal, distraction-free, keyboard-shortcuts tab, print stylesheet + trigger, "clear my data", per-article table-column + scroll/collapse prefs.

**Files:**
- Create: `components/settings/PreferencesModal.tsx`, `ThemeControls.tsx`, `DistractionFree.tsx`, `PrintTrigger.tsx`, `ClearData.tsx`, `KeyboardShortcutsTab.tsx`
- Create: `lib/storage/settings.ts` (ported `Settings` + `Theme` from `js/storage/settings-theme.js`), `lib/hotkeys.ts`
- Modify: `app/layout.tsx` — mount modal + apply settings on load + OS theme listener; keep `css/print.css` in the import chain
- Tests: co-located

- [x] **Step 1: Failing test — `lib/storage/settings.ts` + theme application**

Port `Settings` / `Theme` / `applySettingsToDOM` / `initOsThemeListener` from `js/storage/settings-theme.js`. Theme = light / dark / system; background presets are **computed** (`--bg`/`--surface`/`--accent` set in JS, not named `data-theme` blocks — spec §3 / `css/themes.css` note). Multi-tab: `SETTINGS_KEY` `storage` event re-applies. Test: set theme dark → `data-theme="dark"` on root; set a bg preset → CSS vars updated; system + OS dark → dark applied.

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: Apply settings in the root layout** — an inline script (pre-hydration, to avoid a flash) reads the theme from `localStorage` and sets `data-theme` + computed vars before first paint. Port the boot theme logic from `index.html`'s inline `<script>` (line ~34).

- [x] **Step 4: Failing test — `PreferencesModal` tabs**

Port from `js/storage/settings-theme.js` swatches + `css/components/preferences-modal.css`: theme tab, a keyboard-shortcuts tab, a "clear my data" action. Test: open → theme tab default; switch to shortcuts tab → shortcut list rendered.

- [x] **Step 5: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 6: `DistractionFree`** — port `js/app/distraction-free.js` — toggle hides chrome, `Esc` exits. Test: toggle → `.distraction-free` on body.

- [x] **Step 7: `PrintTrigger` + print stylesheet** — `css/print.css` stays in the `wiki.css` import chain (already there). `PrintTrigger` calls `window.print()` after expanding collapsed regions. Port `js/app/print.js`. Test: trigger → collapsed sections expanded, `print` called.

- [x] **Step 8: `ClearData`** — port `js/storage/data-clear.js` — wipes bookmarks/highlights/notes/pinned-wikis from local (highlights/notes keys exist even though those features are `post-cutover.md` — clear them anyway for forward-compat, or scope to what exists; match `data-clear.js`). Confirm dialog first. Test: confirm → keys removed.

- [x] **Step 9: `lib/hotkeys.ts` + full keyboard shortcut set** — port the shortcut map from `js/app.js` (⌘K search, ⌘B bookmarks, `g`/`Shift+G` were graph — DROPPED, omit them, `?` help, `/` find, theme toggle, etc.). A single `keydown` handler, "not while typing" guard, respects `prefers-reduced-motion` where relevant. Test: each live shortcut fires its action; dropped ones are absent.

- [x] **Step 10: Per-article local prefs** — table-column prefs (`lib/storage/table-columns.ts`, done in Phase 3h) + scroll-position / section-collapse cache (`lib/storage/scroll-collapse.ts`, ported from `js/storage/scroll-collapse.js`). On article mount, restore scroll + collapse state; on unmount/scroll, save. Test: scroll an article, navigate away, back → scroll restored.

- [x] **Step 11: typecheck + lint + test + visual check** — theme switches with no flash, presets work, distraction-free, print expands collapsibles, clear-data works, shortcuts fire, scroll position restores.

**Exit criteria:** settings + preferences fully ported, theme applies pre-paint (no flash), keyboard shortcuts match today minus the dropped ones, per-article prefs persist.

---

## Phase 10 — Mobile: TOC drawer, swipe gestures, panel-close registry, viewport handling

**Goal:** the mobile interaction layer. Much of the gesture logic is shared with Phases 2/8 islands; this phase is the mobile-specific drawer + the cross-cutting registries.

**Files:**
- Create: `components/mobile/TocDrawer.tsx`, `SwipeGestures.tsx`, `PanelCloseRegistry.tsx`, `ViewportHandler.tsx`
- Modify: `ReaderIslands.tsx` (TOC becomes a drawer on mobile), `app/layout.tsx` (mount the registries)
- Tests: co-located

- [x] **Step 1: Failing test — `TocDrawer` opens/closes on mobile**

Port `js/app/mobile-panels.js` TOC drawer — on `<= 900px`, the TOC is a slide-in drawer with a toggle button; `Esc` / backdrop / swipe closes it. Test: mobile viewport, click toggle → drawer open; `closeTopmost()` → drawer closes first (registry ordering from `js/app/mobile-panels.js`).

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: Failing test — `SwipeGestures` edge-swipe-back + panel-close**

Port the `bindSwipeGestures` IIFE from `js/app/mobile-panels.js`: constants `SWIPE_THRESHOLD=50`, `EDGE_ZONE=44`, `DEADZONE=8`, `axisLock(dx,dy)`, left-edge swipe → history back, right-edge swipe → forward, gated mobile-only, lightbox owns its own gestures (skip when target is in `#zoom-overlay`). Test: synthetic left-edge swipe past threshold → `history.back` called.

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: `PanelCloseRegistry`** — the shared "what does Esc / back-gesture close next" stack. Port `closeTopmost` from `js/app/mobile-panels.js` — order: mobile TOC → auth modal → wiki switcher → bookmarks modal → search modal → ... Unifies with `modalRegistry` from Phase 1. Test: multiple panels open → `closeTopmost` closes in the defined order.

- [x] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 7: `ViewportHandler`** — port the resize handler from `js/app/mobile-panels.js`: debounced 150ms, closes mobile TOC + search on a significant width change, clears stale hover-preview position. Mermaid: the client-island path is in use (`mermaid-spike-result.md`) — dispatch a `wiki:diagram-relayout` event on a significant width change so `MermaidDiagrams` can re-run `mermaid.run` (SVG text-wrapping is width-sensitive); debounce it with the resize handler. Also `visualViewport` handling for the mobile keyboard. Test: fire a resize crossing the breakpoint with the TOC open → TOC closed; a width change → the diagram-relayout event fires.

- [x] **Step 8: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 9: typecheck + lint + test + mobile visual check** (DevTools device mode) — TOC drawer, edge-swipe nav, panel-close ordering, resize behaviour.

**Exit criteria:** mobile interaction layer ported. Gesture constants match today. Panel-close ordering unified across modal + mobile registries.

---

## Phase 11 — PWA: save-for-offline + evict + install prompts

**Goal:** the user-facing offline layer on top of the Serwist SW from `app-skeleton.md` Phase 5 — explicit save, per-article evict, the `/offline` shelf, install prompts.

**Files:**
- Create: `components/pwa/SaveOffline.tsx`, `InstallPrompt.tsx`, `IosNudge.tsx`
- Create: `app/offline/page.tsx` — upgrade from the Phase-5 stub to the real shelf (lists saved articles, last-cached date, per-article evict)
- Create: `lib/pwa/article-cache.ts` — direct Cache Storage ops over the `wiki-articles` cache
- Modify: `Topbar.tsx` / settings — the "save for offline" control
- Tests: co-located

- [x] **Step 1: Failing test — `lib/pwa/article-cache.ts`**

Port `js/storage/offline.js`: `saveArticle(path)` fetches the article HTML + its page-specific assets and `cache.put`s them into `wiki-articles`; `evictArticle(path)` deletes them; `isSaved(path)`; `listSaved()` returns `{ path, cachedAt }[]`. Test (mock `caches`): save → entry present; evict → gone.

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: `SaveOffline` island** — a button on the article page: "Save for offline" ↔ "Saved" ↔ evict, driven by `article-cache.ts`, toast on completion. Port the button-state logic from `js/storage/offline.js` `updateOfflineBtn`. Test: click → `saveArticle` called, button flips to "Saved".

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: Real `/offline` shelf** — `app/offline/page.tsx` becomes a client page listing `listSaved()` with last-cached date + a per-article evict button + a dimmed state for the currently-offline case. Port `js/render/offline-view.js`. Test: two saved articles → both listed; click evict → removed from the list.

- [x] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 7: `InstallPrompt` + `IosNudge`** — port `js/app/install-prompt.js` + `js/storage/install-prompt.js`: capture `beforeinstallprompt`, show a banner; iOS gets an "Add to Home Screen" nudge toast (dismissal persisted in `localStorage`). Test: fire `beforeinstallprompt` → banner shows; dismiss → flag set, no re-show.

- [x] **Step 8: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 9: typecheck + lint + test + offline visual check** — save an article, go offline, confirm it opens; evict it, confirm the offline fallback; install banner appears.

**Exit criteria:** explicit save/evict works over the `wiki-articles` cache; `/offline` shelf lists saved articles with dates + evict; install + iOS nudge ported. The spec §8 model is complete end to end.

---

## Phase 12 — Reader-facing metadata + `robots: Disallow: /`

**Goal:** per-page `<title>` + description + canonical link — **for the reader** (browser tabs, bookmarks, history, link-sharing), not for crawlers. No sitemap, no structured data, no OG images, no Lighthouse SEO gate. `robots` disallows all. Full SEO is the public-launch epic (spec §14). (spec §1, §14, overview.md "Per-page metadata" rule)

**Files:**
- Modify: `app/[vertical]/[...slug]/page.tsx` — `generateMetadata`
- Modify: `app/page.tsx`, `app/[vertical]/page.tsx` — `generateMetadata`
- Create: `app/robots.ts`
- Tests: co-located

- [x] **Step 1: Failing test — article `generateMetadata`**

```tsx
export async function generateMetadata({ params }): Promise<Metadata> { /* ... */ }
```
Test: for a real slug, returns `title` = `"<article title> · <vertical> · Wiki"`, `description` = the article excerpt, `alternates.canonical` = `${CANONICAL_BASE}/<vertical>/<slug>/`. No `openGraph` block needed (not public). `robots: { index: false, follow: false }` in the metadata so even if the page is fetched it is not indexed.

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: Home + vertical `generateMetadata`** — sensible titles/descriptions, same `robots: { index: false }`. Test.

- [x] **Step 4: `app/robots.ts`** — `Disallow: /`. No sitemap reference (there is no sitemap). Confirm `next build` writes `out/wiki-fe/robots.txt` with the disallow.

- [x] **Step 5: Build + confirm** — each of 3 article routes has a correct `<title>` in the browser tab and a canonical link in the HTML; `robots.txt` disallows all. **No Lighthouse SEO check** — it is not a gate (spec §14).

- [x] **Step 6: typecheck + lint + test.**

**Exit criteria:** every route has a reader-facing `<title>` + description + canonical link and `robots: index:false`. `robots.txt` disallows all crawlers. No sitemap. No SEO metric checked.

---

## Phase 13 — e2e infra + mechanical portable sweep

**Goal:** rewrite `conftest.py` for the Next `out/` build and get the **mechanically-portable** shipped-feature e2e tests green — the ones that need only `#hash` URLs → real paths and vanilla selectors (`#view-*.active`, `#markdown-body[data-render-done]`, `window.state`) swapped for Next equivalents. **No test redesign in this phase** — faithful mechanical conversion only. Mock-infra tests (`window.navigateToContent` + `page.route("**/*.md")` + `window.state`) are skip-marked → the post-cutover e2e-modernization epic; the cutover is not gated on them.

**Split rationale (2026-09-09, revised 2026-09-10):** Phase 13 as originally written assumed "selectors and URLs change, test logic is preserved". That holds for a large fraction of tests but not the mock-infra ones — Next has no runtime `.md` fetch, `window.navigateToContent`, or `window.state`. The sweep also surfaced ~6 unported features (see findings below) and made clear the vanilla suite has structural problems (the mock-article pattern tests islands against fake markup, not the real pipeline; ~4s boot per test; brittle `data-action` selectors). Rather than fix all that inside the migration, the decision (2026-09-10, confirmed with the user) is:
- **Phase 13 (here):** mechanical portable sweep only. Gate for cutover = portable subset green + mock-infra skip-marked + the gap documented. Ships with the cutover.
- **Post-cutover e2e-modernization epic** (`docs/tickets-backlog.md`, grouped with the §10 TS port): faithful mock-infra rewrites against real articles, canary-article coverage model, fixture layer, latency (xdist, module-scoped page, kill `wait_for_timeout`), `getByRole` selectors, auth contract/smoke split. Task-scoped tickets, land independently, do NOT gate the cutover.

Mock-infra features (CodeCopy, GlossaryPopover, TabbedCode, …) all have vitest island coverage, so the e2e gap at cutover is an integration-layer gap, not a coverage hole.

**Missing-feature findings (2026-09-09, surfaced by the sweep — none were in Phase 8/9/10 plans or on the §9 drop list; ported inside Phase 13):**
- **Home topbar** — the Next home had no chrome at all (no search / preferences / auth / offline entry). Ported: `components/home/HomeTopbar.tsx`.
- **Pinned wikis (WIKI-297)** — pin a wiki card → it sorts to the front, persisted in `wiki-pinned-wikis`. Ported: `lib/storage/pinned-wikis.ts` + `components/home/PinnedWikis.tsx` (mounts on the RSC card grid; card is now `.wiki-card-wrap` > `<a.wiki-card>` + sibling `.wiki-card-pin-btn`, since a `<button>` can't nest in `<a>`). CSS: wrapper rule + 44px coarse-pointer target (WIKI-406).
- **`/health` cold-start ping** — `components/chrome/HealthPing.tsx` + `pingHealth()` in `lib/api.ts`; ping on load + every 5 min while visible.
- **Vertical-index + `/offline` topbar** — both pages had zero chrome (no back / search / settings / auth). Ported: `components/chrome/IndexTopbar.tsx`, mounted on `app/[vertical]/page.tsx` and `OfflineShelf`.
- **Slide-direction view transitions (WIKI-145, p0)** — forward/back slide by nav-depth delta. Ported: `components/chrome/NavTransition.tsx` (sets `data-nav-direction` + `.nav-forward`/`.nav-back` on `<html>` on `usePathname` change; `base.css` animates `<main>` — class fallback only, no native View Transitions wiring). 
- **Escape-from-article → vertical index** — vanilla hash-router behaviour. Ported: `components/reader/EscapeToIndex.tsx` (guarded by `anyOpen()` + focus-mode / TOC-drawer / find-bar / lightbox checks).

**Slug resolution differs:** the vanilla SPA resolved `#vertical/leaf` by searching every section for `leaf`; Next needs the full path (`/system-design/components/caching/`, not `/system-design/caching/`). Test URL rewrites must use the real built path.

**Backend for auth/sync e2e:** `wiki-be` run locally at `:8001` (`cd wiki-be && uv run uvicorn app.main:app --port 8001`).

**Files:**
- Rewrite: `tests/conftest.py` — serve `out/` under `/wiki-fe/`; drop the CDN mocks (Next bundles everything) and the Mermaid CDN abort; keep `_make_cdn_fulfill_handler` + `force_paint` (imported by tests) as no-op-safe shims where still referenced; new `wiki_page` fixture (`goto /wiki-fe/`, wait for the real home markup); `base_url` = `http://localhost:PORT/wiki-fe`. No new fixtures beyond what exists — the fixture layer is an epic ticket.
- Modify: the shipped-feature `test_*.py` files, portable tests only (see Step 3).
- Do NOT touch: deferred-feature files (`test_dashboard.py`, `test_admin.py`, `test_changelog.py`, `test_notes_scratchpad.py`, `test_complexity_comparator.py`, `test_section_map.py`) — return in `post-cutover.md`.
- Mock-infra tests: mark `@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")` (module-level `pytestmark` where the whole file is mock-infra), do not delete.

- [x] **Step 1: Read `tests/conftest.py` in full.** (done during the split)

- [x] **Step 2: Rewrite `conftest.py`** per the Files note. The server fixture serves the Next `out/` (built by `pnpm build`); `service_workers` stays blocked for non-PWA tests, unblocked only where a test needs the SW. `wiki_page` waits on real home markup, not `#view-home.active`.

- [ ] **Step 3: Sweep, one file at a time.** For each shipped-feature file, convert the portable tests — `#hash` URLs → `/vertical/slug/`, `#view-content.active` → the real content-ready signal, `#view-home.active` / `#view-index.active` → real markup, drop `window.state` / `window.navigateToContent` assertions or swap for DOM equivalents. Run `.venv/bin/python3 -m pytest tests/e2e/test_x.py -v`, fix until the portable subset is green. Skip-mark the mock-infra tests in that file. Files: `test_home.py`, `test_navigation.py`, `test_routing_pathing.py`, `test_links.py`, `test_scroll_toc.py`, `test_keyboard_scroll.py`, `test_a11y_hotkeys.py`, `test_navigation_polish.py` (minus graph), `test_offline_shelf.py`, `test_toc_overhaul.py`, `test_touch_gestures.py`, `test_settings.py`, `test_content_width.py`, `test_read_toggle.py`, `test_index_ux.py`, `test_data_backup.py`, `test_security.py`, `test_behavioral_fixes.py`, `test_html_markup.py`, `test_structure_viz.py`, and the already-real-article parts of `test_content.py` / `test_content_enhancements.py` / `test_search.py` / `test_ux_hotkeys_errors.py` / `test_line_numbers_pathing_help.py`. Auth: `test_auth.py` / `test_recents.py` / `test_bookmarks.py` portable parts, wiki-be run locally at `:8001`.

  **Sweep progress (2026-09-10):**
  - `conftest.py` rewritten — serves `out/` under `/wiki-fe/`, 308-redirects extensionless paths, serves `out/404.html` on any miss (GitHub-Pages parity), `wiki_page` waits on `.wiki-card`, `_ensure_build` fixture. `_make_cdn_fulfill_handler` + `force_paint` kept as shims.
  - `test_home.py` — 14/14 green (rewritten: topbar search/prefs, pinned wikis, `/health`, manifest; parallax tests deleted per §9).
  - `test_navigation.py` — 13/13 green (real paths, breadcrumb, Escape-to-index, WIKI-145 slide direction).
  - `test_routing_pathing.py` — 7/7 green (title updates, deep-link resolution, Next 404 page, static 404.html noindex; hash-router-internals tests deleted with a note — route dedup, stale-state, `404.html?title=` rescue, `js/state.js` import).
  - `test_links.py` — module-level `pytestmark` skip (17 tests, all mock-article; → epic).
  - `test_settings.py` — 54/54 green (2026-09-22, full per-selector rewrite: Next `PreferencesModal` DOM has no `#prefs-modal`/`data-action`/`data-bg`; swatch rows found by `.prefs-section-label` text, dialog by `role="dialog"[aria-label="Preferences"]`, presence/absence replaces `.hidden`-class waits). Surfaced + fixed two real bugs, not just test drift:
    - **`getSettingsSnapshot` OS-preference desync** (`lib/storage/settings.ts`) — on a fresh visit with no stored settings, the boot script + `applySettings(getSettings())` both resolve the OS `prefers-color-scheme`, but `PreferencesModal`'s `useSyncExternalStore` read (`getSettingsSnapshot`) skipped that fallback and always returned the dark-side `DEFAULT_SETTINGS`. Result: panel showed dark accent/text-colour options while `data-theme="light"` was already live, and picking one could store an accent id belonging to the wrong palette (no swatch ever showed active). Fixed by delegating `getSettingsSnapshot` to `getSettings()`; regression test added to `settings.test.ts`.
    - **Auth modal inputs completely unstyled** (`components/auth/AuthModal.tsx` / `css/components/auth.css`) — every `<input>` in every panel (login/register/forgot/reset, 8 total) is bare, no `.auth-field` wrapper; the CSS's `.auth-field input` rule (width/padding/background/border/16px-floor) never matched anything. Fixed in CSS (`.auth-panel input` reaches all of them, no JSX change) rather than retrofitting wrapper divs.
  - Dropped Advanced-tab controls confirmed genuinely absent, not misnamed (kept as documented gaps, not bugs): haptic-feedback toggle, Focus-Mode/Save-Offline buttons in Advanced tab (focus mode is hotkey-only via `f`; save-offline lives on the article topbar), font-extras lazy stylesheet, accent aria-labels, bg-side separator element, paragraph-spacing UI control (`paraSpacing` stays in the settings schema, just no picker).
  - `test_auth.py` — 49/49 green (2026-09-23, full per-selector rewrite: no ids anywhere in `AuthModal.tsx` — `aria-label`/role/text selectors, dialog scoped via `role="dialog"[aria-label="Account"]`). Surfaced + fixed four real bugs, not just test drift:
    - **Double-submit fired two requests on every auth form** (`components/auth/AuthModal.tsx`) — `run()`'s busy guard read React state (`busy`), which lags a render behind two synchronous clicks (double-click, or a fast double Enter). Fixed with a synchronous `busyRef`.
    - **Login inputs had no `aria-invalid`/`aria-describedby` on error** — added both, linked to a new `#auth-login-error` paragraph; clears on panel swap (existing `swap()` behaviour, no new code needed there).
    - **Register/reset panels had a password-type input wired to `showPw` but no toggle button to flip it** — only the login panel had `PasswordRevealToggle`. Extracted the toggle into a shared component and added it to all three panels.
    - **Reset panel was a dead end** — an expired/invalid reset token panel (`?mode=reset&token=...`) had zero recovery links, only Escape/backdrop-click to leave. Added "Back to log in" + "Request a new link".
    - Also fixed: register-panel inputs never disabled during the in-flight request (only the submit button did — `disabled={busy}` added to all three register inputs); the `verify-result` panel had no resend path on a failed verify-from-link at all (added a resend sub-form, mirroring the `verify` panel's); a mount-order race in `app/layout.tsx` — `<SessionInit>` mounted before `<AuthModal>`, so its boot-param handler (`?mode=reset|verify&token=...`) called `openAuthModal()` against a still-null opener and silently no-opped. Reordered `<AuthModal>` first.
    - Not ported (UI genuinely absent, not renamed — confirmed via dead CSS / no matching JSX): the dedicated migrate-modal (`anonDataExists()` keep/discard is a plain `window.confirm()` now, not app UI); mobile bottom-sheet/drag-handle (`.auth-drag-handle` is dead CSS); a modal close button (`Modal.tsx` has none — Escape/backdrop only, same as every other modal in this port). `test_session_changed_same_article_does_not_tear_down_reading_state` dropped — vanilla's regression was a router-level listener on `wiki:session-changed` tearing down focus mode; Next's `useSession` is the only consumer of that event and just re-reads session state, nothing to regress. `test_logout_clears_highlights_markers_notes` dropped — those `lib/storage` modules don't exist yet (post-cutover.md scope), nothing can write those keys yet.
  - `test_search.py` — 28/28 green (2026-09-23, full per-selector rewrite: no ids in `SearchModal.tsx` — `.gsearch-input`/`.gsearch-dialog` etc. class selectors, dialog scoped via `role="dialog"[aria-label="Search"]`). Two real test-authoring bugs found and fixed here, not product bugs — vanilla `expandQuery()` behavior (forward-only `synonyms.json` key→values lookup, confirmed identical in both `js/search/search-features.js` and the Next port — byte-identical data file too) was faithfully ported; the original synonym test's query (`"map"`) was never a real key, it only appears as a *value*, so it could never have worked in either app. Fixed by testing a real key→value pair (`"queue"` → `"deque"`) instead. Also fixed a sticky-header test that hand-set DOM classes instead of scrolling for real — `StickyHeader.tsx`'s `body.sticky-header-visible` class is driven by an actual scroll listener, not something poke-able directly.
    - **Confirmed a real, large feature gap — command palette (`/`, verb commands like `/quiz <topic>`), wiki-scope filtering (native + custom mobile scope dropdown), ⌘F scoped search, placeholder rotation, and load-failure/retry UI are all unbuilt.** CSS for every one of these exists in `search-modal.css`, fully unused — dead selectors waiting on a future build. None of this was ever in the migration plan's Phase 7 scope (only score/synonyms/section-filter/snippets/recents were specified there). User decision (2026-09-23): skip-mark, treat as post-cutover — not rebuilt during this sweep. A follow-up ticket for these should be filed before Phase 15's exit gate.
    - Also confirmed: search here has no debounce and nothing to retry-on-failure by design, not omission — `SearchModal.tsx` loads `search-index.json` once on open and filters already-loaded entries synchronously via `useMemo`, no per-keystroke network round-trip like vanilla's fetch-based flow.
  - `test_scroll_toc.py` — already swept in an earlier session (2026-09-10, real ids: `#toc-nav`/`#toc-sidebar`/`#toc-mobile-btn`/`#sticky-section-header`, not discovered until this session re-checked it) — reconfirmed 14/14 green + 3 intentionally skip-marked (2026-09-23). The three skips point at real backlog tickets filed that session, not placeholders: **WIKI-651** (resume-by-idea chip — Next silently auto-scrolls instead of showing a jump chip), **WIKI-652** (collapsible TOC sections — Next `Toc` is flat, no per-h2 chevron collapse or `#toc-collapse` collapse-all), **WIKI-653** (scroll-key eviction manifest — `lib/storage/scroll-collapse.ts` writes `wiki-toc-scroll-*` keys with no manifest, so "clear my data" can't find them to evict). All three `p3`, in `docs/tickets-backlog.md`.
  - `test_a11y_hotkeys.py` — 8/8 green + 1 skip-marked (2026-09-23, full per-selector rewrite — no ids in `SearchModal`/`WikiSwitcher` dialogs, `role="dialog"[aria-label=...]` scoping same as the other Modal-based components). Zero product bugs — every failure mode was either a selector rewrite or a genuine architecture difference, documented rather than silently dropped:
    - `resume_chip_shown_and_restores_scroll` skip-marked against **WIKI-651** (already filed, same ticket `test_scroll_toc.py` uses).
    - **Filed WIKI-656**: heading anchor links (`rehype-autolink-headings` default config in `lib/content/pipeline.ts`) render `aria-hidden="true" tabindex="-1"` — keyboard/screen-reader unreachable. Vanilla's `.anchor-btn` was a real focusable, labeled button. Real regression, not test drift — flagged as a ticket rather than silently dropped since it wasn't a quick fix (needs a custom rehype config or small plugin).
    - Dropped (architecture genuinely different, not a gap): Space-key-activates + aria-label tests for `.wiki-card`/`.index-card` — both are real `<a>`/`next/link` elements now (confirmed in `app/page.tsx` and `KeyNav.test.tsx`'s own fixture), not `role="button"` divs faking anchor behaviour; a real link doesn't need an aria-label with visible text and doesn't activate on Space (only Enter, which already works) — the vanilla workaround this test guarded is gone because the underlying element is now correct. sessionStorage search-index caching test dropped — `SearchModal` loads `search-index.json` once per modal-open and filters in-memory; there's no repeated fetch to cache against.
  - `test_touch_gestures.py` — rewritten (2026-09-23): confirmed link-graph (`g` hotkey) dropped per spec §9; long-press peek sheet for internal links never built → **filed WIKI-657**; sessionStorage search-index caching doesn't exist in this architecture (`PullToRefresh` calls `pullAll()` for real instead of reading a cache). Edge-swipe tests rewritten to navigate for real through home→index→article, since `SwipeGestures.tsx` uses genuine `history.back()`, not a deterministic SPA route stack the old mock could fake.
  - `test_bookmarks.py` — 12/12 green (2026-09-24, full per-selector rewrite: no ids in `BookmarksModal.tsx`, dialog scoped via `role="dialog"[aria-label="Bookmarks"]`, entries by `.bookmarks-modal-entry`/`-wiki`/`-remove`). Surfaced + fixed two real bugs, not test drift:
    - **⌘B silently failed to open the modal** (`components/chrome/BookmarksModal.tsx`) — the component had its own internal `keydown` listener (toggle: `setOpen(v => !v)`) *in addition to* listening for the `wiki:open-bookmarks` custom event that `lib/hotkeys.ts`'s global hotkey handler dispatches on the same keystroke. Both fired on one physical keypress; React batched `setOpen(true)` (from the event listener) then `setOpen(v => !v)` (from the redundant raw listener) in the same update, and the functional updater flipped the just-queued `true` back to `false` — net result, the modal never visibly opened. Fixed by deleting the component's own keydown listener entirely and folding its toggle behavior into the event handler (`lib/hotkeys.ts` already owns the keystroke and is the single source of truth); confirmed the fix by re-testing "press ⌘B again while open closes it" as an explicit toggle test rather than leaving that behavior unverified.
    - **Bookmark URLs 404'd for any article not directly under its wiki root** (`lib/storage/bookmarks.ts`) — `deriveBookmark()` built the stored `slug` by taking only `path.split("/").pop()`, i.e. the bare filename, discarding intermediate directories. `content/system-design/components/caching.md` produced slug `caching` instead of `components/caching`, so `BookmarksModal`'s `goTo()` (`/${wikiId}/${slug}/`) navigated to `/system-design/caching/` — a route that doesn't exist, since the real page lives at `/system-design/components/caching/`. Every nested (non-top-level) bookmark was unreachable from the bookmarks modal. Fixed by deriving the slug the same way the rest of the app does (strip the vertical's content-root prefix, keep the rest, drop `.md`) instead of re-deriving it from just the basename; regression test added to `bookmarks.test.ts` asserting the slug keeps its subdirectory.
    - Dropped: per-section "clear bookmarks" button on the index strip (`BookmarksStrip.tsx` renders plain `<Link>` chips, no clear control — the only clear path now is the global "Clear everything" in Preferences → Advanced, already covered by `test_settings.py::test_clear_everything_wipes_local_data`); Settings-panel bookmark toggle (never existed); "reopening the modal is a no-op" (⌘B is a real toggle now by design — pressing it again while open closes the modal, verified as its own test instead of asserting a no-op that would no longer be true).
  - `test_recents.py` — 7/7 green (2026-09-24, full rewrite: no clear-button/show-more/undo UI in `RecentsStrip.tsx` anymore, so those old vanilla test cases were dropped rather than ported — see the file's top comment). No real product bugs found; `lib/storage/recents.ts`'s `deriveRecent()` already strips the vertical content-root prefix correctly (unlike the earlier bookmark-slug bug), confirmed via a nested-article navigation test. One test-authoring bug in the new suite itself: `_visit_article`'s dwell trigger did `scrollTo` + a fixed 150ms wait, which raced React hydrating `ReadTracker.tsx`'s scroll listener on a loaded machine — the scroll fired before the listener existed, so nothing recorded and later tests in the same run hung on `#recents-section` never appearing. Fixed by waiting for the actual `wiki-recents` localStorage write (`page.wait_for_function`) instead of a guessed delay.
    - Dropped (deliberately removed, not a gap): per-section clear button, show-more/overflow strip (`RECENTS_MAX=6` caps the list before any overflow could occur — no hidden chips ever exist to reveal), undo-after-clear toast (global "Clear everything" in Preferences → Advanced replaced it with a `window.confirm()` "cannot be undone" gate) — already covered by `test_settings.py::test_clear_everything_wipes_local_data`.
  - `test_index_ux.py` — 10/10 green (2026-09-24, full rewrite: index page is now a server component — `app/[vertical]/page.tsx` — so most of the vanilla client-side index machinery is simply gone, not renamed). No real product bugs found; every drop is a genuine architecture simplification, not a regression. Dropped (confirmed via grep, no producing component/handler for any of these): custom index-view scroll persistence (`indexScroll` key orphaned in `keys.ts`, nothing writes it — Next's router owns scroll now); the stub-detection loading gate (`.index-sections--loading` never appears — `isStub` is known server-side at build time, no async gate needed); the inline filter and "incomplete/completed only" read-select (`#index-filter-input`/`#index-filter-read-select` — no such controls anywhere in `IndexTopbar.tsx` or the index page); collapsible sections (`.section--collapsed` — `section-header`/`index-card-grid` render but nothing binds a click handler or reads `wiki-section-collapsed-*`); the unavailable-card tooltip title (no `title` attr on the card `Link` — stub articles get their own dedicated placeholder page at `app/[vertical]/[...slug]/page.tsx` instead, so the destination communicates unavailability rather than a hover tooltip); the coarse-pointer swipe hint (`.index-card-swipe-hint` has CSS in `view-index.css` but no component renders the element); the "changed since you last read" updated-dot and `index-card-meta`/`index-card-read-time` (all orphaned CSS, zero producing JSX); the 44px touch-target regression check (its `.index-ctrl-btn`/`#index-filter-input` targets don't exist to measure). Swipe-to-bookmark on index cards is already fully covered in `test_touch_gestures.py`, not re-added here. Kept/added real coverage for what does exist: unavailable-card grayscale filter + it staying a real navigable link, arrow-key focus nav between cards (`KeyNav.tsx`), completed-card read-dot + fade wiring (`IndexCardStatus.tsx`), and the Learning Paths progress bars against real DSA/SD content (`LearningPathBars.tsx`, `Standard SWE`/`Components Foundation` tracks).
  - `test_data_backup.py` — 0/0 (2026-09-24, entire file dropped): confirmed via grep (zero matches for export/import/download/upload/data-clear-* across `app/`, `components/`, `lib/`) that JSON export/import backup and the selective data-clear UI (per-category checklist, wiki-scope selector, confirm step, version-mismatch warning) don't exist in the Next port at all — `PreferencesModal`'s Advanced tab has only one global "Clear everything" button (`clearData(DATA_CATEGORIES.map(c => c.key))` behind a `window.confirm()`), already fully covered by `test_settings.py::test_clear_everything_wipes_local_data`. No real bug found; file reduced to a one-line drop-note, no lib/component changes made.
  - `test_keyboard_scroll.py` — 3/3 green (2026-09-25, full rewrite). Dropped index-scroll persistence (same orphaned `wiki-index-scroll-*` key `test_index_ux.py` already confirmed dead) and the TOC-click pulse (`.toc-heading-pulse` is dead CSS — `Toc.tsx`'s `onClick` only does `scrollIntoView` + `history.replaceState`, never toggles the class; `test_scroll_toc.py` already covers real TOC-click behavior). `b`-hotkey test rewritten against `localStorage`'s `wiki-bookmarks` key instead of a `.active` toggle-button class — there's no visible per-article bookmark button in the port anymore, `lib/hotkeys.ts` fires `toggleBookmark()` silently. No real bugs found.
  - `test_toc_overhaul.py` — kept 6/6: per-heading collapse (`.heading-collapse-btn`, shared `wiki-heading-collapsed-*` key, stale-key GC via `gcCollapseKeys`), `.toc-current` scroll tracking. Dropped: TOC H2-group/chevron collapse + `.toc-passed` class (flat `Toc.tsx`, same gap as WIKI-652 — CSS for grouping exists in `toc-sidebar.css` but that file isn't imported anywhere), TOC/Notes-rail 70/30 split (no notes-scratchpad component mounted in `ReaderIslands.tsx` yet), empty-heading-id sync (moot — `rehype-slug` guarantees ids at build time). No overlap with `test_scroll_toc.py` (scroll/drawer/sticky-header vs. this file's collapse/current-tracking). No product bugs found.
  - `test_read_toggle.py` — 6/6 green (2026-09-25, full rewrite). The vanilla `.completion-btn` toggle is gone entirely — confirmed via grep that `lib/storage/completions.ts`'s `markCompleted`/`markUncompleted` have zero call sites outside that file, so nothing in the UI can set completion state anymore (only a server sync pull can). Filed WIKI-658 for the gap. Dropped the button presence/click/toggle/label/persistence tests and the haptic-on-milestone tests (`study-feedback.js` never ported — zero `navigator.vibrate` call sites in `components/`/`lib/`) and the anon-no-API-call test (no UI action left to trigger it). Read-dot/learning-path completion wiring already covered in `test_index_ux.py`, not duplicated here. Kept/added real e2e coverage (against the actual built markdown pipeline output, not synthetic HTML) for the two remaining completion-state consumers with no existing e2e coverage: `CardCompletion.tsx` (related-card done styling) and `PrereqStatus.tsx` (prereq-chip done styling, already vitest-covered with synthetic fixtures but not e2e), plus reload persistence. No real product bugs found beyond the WIKI-658 gap.
  - `test_offline_shelf.py` — 9/9 green (2026-09-25, full rewrite: real route is `/offline/` not `#offline`, rendered by `app/offline/page.tsx` → `OfflineShelf.tsx`, backed by `lib/pwa/article-cache.ts` (Cache Storage bucket `wiki-articles`, not `wiki-articles-v1`); per-article save/evict is `SaveOffline.tsx` on `ReaderTopbar`, shelf link lives in `HomeTopbar` not `IndexTopbar`). Dropped, grep-confirmed gone: bulk "Download all" (no `download-all`/`downloadAll` anywhere), index-card offline-dimming while offline (no `offline-uncached` string exists — `IndexCardStatus.tsx` only fades for read/completion, unrelated concept). No real product bugs; added `browser_context_args` service-worker unblock (project default blocks SW) and one new real-flow test exercising the actual `SaveOffline` button end-to-end into the shelf. Related vitest (`OfflineShelf.test.tsx`, `SaveOffline.test.tsx`, `article-cache.test.ts`) 11/11 green, unchanged.
  - `test_content_width.py` — 8/8 green (2026-09-25, full rewrite: real `PreferencesModal` selectors — `.prefs-section-label` text "Content width" scoped inside `role="dialog"[aria-label="Preferences"]`, no ids). Surfaced + fixed one real bug, not just test drift:
    - **Content-width setting was fully non-functional** (`lib/storage/settings.ts`) — `applySettings()` wrote the picked width to CSS var `--content-inset`, but every consumer (`css/view-content/layout.css`, `css/responsive.css` incl. the WIKI-378 tablet-floor rule) reads `--layout-padding`; zero CSS rules ever read `--content-inset`. Result: Narrow/Default/Wide updated React state and localStorage correctly but never actually resized the article — width stayed pinned to the CSS fallback (`10%`) regardless of selection, and the WIKI-378 tablet floor was equally dead. Fixed by renaming the property write to `--layout-padding`; regression test added to `settings.test.ts`.
    - No features dropped — Preferences width picker, CSS-var application, WIKI-378 tablet floor, and localStorage persistence all confirmed live and now correctly wired.
  - `test_security.py` (2026-09-25, 0 tests, both dropped) — full security audit done in place of a rewrite: no e2e-testable XSS surface remains. `lib/content/pipeline.ts` has no sanitizer (`rehype-raw` + `allowDangerousHtml`, no `rehype-sanitize`/DOMPurify) but this is intentional per an explicit code comment (`app/[vertical]/[...slug]/page.tsx:64`) — content is git-authored/build-time only, no runtime untrusted input reaches any `dangerouslySetInnerHTML` sink (all 4 are build-time strings). External-link `rel=noopener noreferrer` already unit-tested in `article-links.test.ts`; no real content has external links to drive an e2e duplicate. CDN-SRI and error-message-escaping tests dropped — no surviving equivalent (no CDN `<script>` tags, everything bundled at build time; no client-side fetch-catch-innerHTML path exists). Filed **WIKI-659** (p3, defense-in-depth: add `rehype-sanitize`) — not urgent, no exploitable path found today.
  - `test_html_markup.py` — 7/7 green (2026-09-25, full rewrite against real pipeline output; skip-link/CDN-defer/data-action tests dropped — all vanilla-JS-era concepts, confirmed absent from `app/`/`components/` via grep). Surfaced + fixed a real bug: `lib/content/pipeline.ts`'s `rehypeAutolinkHeadings` call had no `content` option, so every heading anchor-link rendered the library's default empty `<span class="icon icon-link">` with no CSS rule filling it — the anchor icon was invisible on every heading across every article (distinct from WIKI-656, which is about the icon being unreachable, not invisible — both bugs on the same element). Fixed by passing a `content` builder emitting `<svg class="icon" aria-hidden="true"><use href="#icon-anchor"></use></svg>`, matching the sprite-icon pattern used everywhere else in `components/`. New coverage added: anchor-icon SVG structure, `.section`/`.section-body` container validity, heading id uniqueness (`rehype-slug`), code-header traffic-light/copy-button structure, callout icon/variant markup. Related vitest (`pipeline.test.ts`, `toc.test.ts`, `plugins/*.test.ts`) 61/61 green.
  - `test_navigation_polish.py` — 13/13 green (2026-09-25, full rewrite). Dropped per spec §9 (grep-confirmed, zero producing markup): link-graph g/G hotkey + index list/graph view toggle; index collapse-all/expand-all was already confirmed dead in `test_index_ux.py`'s sweep, not re-added; mobile bottom-sheet wiki-switcher (`.wiki-switcher-dialog`/`-drag-handle`/`-hint` are orphaned CSS, `WikiSwitcher.tsx` never renders those elements). Arrow-key next/prev-within-section already covered by `test_index_ux.py`'s `KeyNav.tsx` tests, not duplicated; added the two boundary cases it didn't cover (down-stops-at-last-card, up-to-previous-card) plus Enter-on-focused-card navigation. Surfaced + fixed a real bug: `WikiSwitcher.tsx` had its `Modal` `className`/`backdropClassName` props swapped relative to every sibling modal (`SearchModal`/`PreferencesModal`/`BookmarksModal`), so the dialog card covered the full viewport and a backdrop click to dismiss the switcher was structurally impossible. Fixed by swapping to `className="wiki-switcher-dialog"` / `backdropClassName="wiki-switcher-modal"`, matching the established pattern — confirmed via a real overlay-click e2e test that failed before the fix, passes after. Also confirmed the W hotkey has no `isArticle` gate in `lib/hotkeys.ts` (unlike the old vanilla version) — now opens from home too, and toggles closed on a second press.
  - `test_ux_hotkeys_errors.py` — 12/12 green (2026-09-26, full rewrite — last full-rewrite file before the skip-mark/epic group). Surfaced + fixed two real bugs, not just test drift:
    - **Escape navigated away instead of no-oping during focus mode / distraction-free** (`components/reader/EscapeToIndex.tsx`) — its guard checked `document.body.classList.contains("focus-mode")`, but `FocusMode.tsx` puts that class on `.markdown-body`, never `body`, so the check was dead code; distraction-free wasn't checked at all, and `DistractionFree.tsx`'s own Escape listener (mounted later in `app/layout.tsx`) registered too late to beat the navigation. Fixed the selector and added the missing check; `EscapeToIndex.test.tsx` was silently asserting against a hand-set class on the wrong element and is now corrected too.
    - **`w` could stack the wiki switcher on top of an already-open modal** (`lib/hotkeys.ts`) — no `anyOpen()` gate existed on the W dispatch. Fixed by threading `anyModalOpen` through `HotkeyContext`, wired from `modalRegistry.anyOpen` in `SettingsInit.tsx`.
    - Dropped (confirmed via grep, not assumption): fetchText 404/network-error message tests + broken-slug toast-then-redirect (no client fetch-catch-innerHTML path survives; unknown routes are real `app/not-found.tsx` 404s, same conclusion as `test_security.py`'s sweep); Advanced-tab focus button (`#prefs-focus-toggle` doesn't exist, hotkey-only via `f`, already covered by `test_settings.py`); Preferences "Actions" tab (`PreferencesModal.tsx`'s `Tab` type has no `"actions"` — no `#content-overflow-btn`/`prefs-action-row` anywhere); `distraction-free-exit-btn` and the old WIKI-278 reset-view confirm-dialog escape hatch (no `confirm()` tied to Escape/mode-reset anywhere in the app).
    - Not duplicated: `,`/`b`-toggle/`t`/`T`/`w`-basic-open hotkeys (`test_keyboard_scroll.py`, `test_a11y_hotkeys.py`, `test_navigation_polish.py`) and generic modal mechanics — body-scroll-lock, double-open-then-single-close, escape-closes-topmost (all covered by `components/common/Modal.test.tsx`, the shared base every dialog is built on).
    - Possible follow-up (not filed as a ticket): `mod+k`/`mod+b`/`,`/`?` in `lib/hotkeys.ts` remain ungated against `anyOpen()` like `w` now is — deliberately out of scope here since `,`/`?` legitimately re-tab the same already-open settings modal, so a blanket gate needs a "different modal vs. same modal" distinction this fix didn't need to make.
  - **Full-rewrite sweep complete.** Remaining: `test_behavioral_fixes.py`, `test_content.py`, `test_content_enhancements.py`, `test_structure_viz.py` — per Step 4, these get reduced to dropped-feature notes (mock-article/quiz-me/graph-overlay/parallax/study-feedback/debug-overlay/freeze-frame tests deleted with a one-line note pointing at spec §9 or the WIKI-645/646 e2e-modernization epic), not full rewrites.

- [ ] **Step 4: Delete dropped-feature test functions** — quiz-me tests (`test_content_enhancements.py`), graph-overlay tests (`test_navigation_polish.py`), parallax / study-feedback / debug-overlay / freeze-frame tests. One-line note per deletion pointing at spec §9.

- [ ] **Step 5: Run the swept subset** — `.venv/bin/python3 -m pytest tests/e2e/ -v` (deferred + skip-marked excluded). Green. (User runs the full suite themselves per repo rule.)

**Exit criteria:** `conftest.py` serves the Next build; every mechanically-portable shipped-feature test passes; mock-infra tests are skip-marked (not deleted) with `reason="e2e-modernization epic — mock-article rewrite"`; dropped-feature tests removed; deferred-feature files untouched. The e2e-modernization epic tickets are filed in `docs/tickets-backlog.md`.

---

## Phase 14 — The atomic cutover (first real Pages deploy)

**Goal:** delete the vanilla app, add the CI `deploy` job, switch the Pages source, and ship. When this phase's change lands, the Next app is the live site. **This is the first time anything deploys to Pages.**

**Files:**
- Delete: `index.html`, `js/**` (every file), `wiki-sw.js`, the root `404.html` (Next emits its own)
- Modify: `.github/workflows/ci.yml` — add a `deploy` job (`needs: [build]`); remove the `cache-version` job (its target `wiki-sw.js` is gone); point `tests-light` / `tests-heavy` at the swept suite against the `build` artifact. Keep `search-index` / `backlinks` / `broken-links` / `bridges` Python jobs as the equivalence backstop until `post-cutover.md`.
- Modify: repo Settings → Pages — source = "GitHub Actions" (one-time manual step)
- Modify: `biome.json` — remove `js/**` from `ignore` (files gone)

- [ ] **Step 1: Pre-cutover checklist** — confirm every cutover-critical row from spec §5 Sub-spec 3 "In scope" is green: reader (all islands), home + index, routing, search, auth, `lib/api.ts`, synced domains, settings, per-article local, mobile, chrome, PWA save/evict. Walk the list explicitly, tick each against a working local build.

- [ ] **Step 2: Confirm the `wiki-be` CORS ticket is resolved** — the one filed in `app-skeleton.md` Phase 8. If it flagged a required CORS change, that must be done in `wiki-be` before this deploy or the personal layer breaks. If it was "no change needed", proceed.

- [ ] **Step 3: Confirm no live import of `js/**`** — grep `app/`, `components/`, `lib/` for any `js/` path. Must be zero. Grep for references to dropped modules (`graph-engine`, `link-graph`, `home-parallax`, `debug-overlay`, `freeze-frame`, `study-feedback`) — zero.

- [ ] **Step 4: Delete the vanilla files** — `index.html`, all of `js/`, `wiki-sw.js`, root `404.html`. Run `pnpm build` — must still succeed (nothing in the Next app depended on them).

- [ ] **Step 5: Add the `deploy` job to `ci.yml`**

```yaml
  deploy:
    needs: [build]
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out
      - id: deployment
        uses: actions/deploy-pages@v4
```
No Chromium step — client-island Mermaid (`mermaid-spike-result.md`), no build-time render.

- [ ] **Step 6: Update the rest of `ci.yml`** — remove the `cache-version` job. Point `tests-light` / `tests-heavy` at the swept suite, consuming the `build` job's `out/` artifact (or running `next dev`).

- [ ] **Step 7: Set the Pages source** — repo Settings → Pages → source = "GitHub Actions". One-time manual step. This is what makes the next successful `build → deploy` replace the vanilla app at `/wiki-fe/`.

- [ ] **Step 8: Post-deploy verification against the live `/wiki-fe/` URL** — every route loads; offline works; auth + sync work against the live `wiki-be`; each page has a correct `<title>`; `robots.txt` disallows all. **No Lighthouse SEO check** (spec §14). This is the spec §5 Sub-spec 3 exit criteria minus the SEO line.

- [ ] **Step 9: Old service worker cleanup** — the old `wiki-sw.js` registered at `/wiki-fe/wiki-sw.js`; the new one is `/wiki-fe/sw.js`. Returning visitors have the old SW cached. Serwist's `skipWaiting` + `clientsClaim` plus the old `wiki-sw.js` now 404-ing (so it can't update) means it is eventually discarded — but add a tiny unregister shim in the layout's registration script: on load, if an old `wiki-sw.js` registration exists, unregister it. One-line comment. Verify a returning-visitor simulation (register old SW against the vanilla build, deploy new, reload twice) lands on the Next app.

**Exit criteria:** `index.html` + `js/**` + `wiki-sw.js` deleted. The Next app is live at `/wiki-fe/` (first real deploy). All cutover-critical routes work, offline verified, old SW cleanly replaced, each page titled, `robots` disallows all. The e2e subset passes against the live build. No SEO gate.

---

## Phase 15 — Sub-spec 3 exit gate

**Files:**
- Create: `docs/_meta/plans/nextjs-migration/sub-spec-3-exit.md`

- [ ] **Step 1: Fill the exit checklist against spec §5 Sub-spec 3 exit criteria**
  - cutover-critical checklist green (every "In scope" row) ✅/❌ — itemised
  - Python e2e mechanically-portable subset passes against the Next build ✅/❌ + run evidence; mock-infra tests skip-marked → e2e-modernization epic; those epic tickets filed
  - static export deploys to Pages at the subpath (first real deploy), every route loads ✅/❌
  - offline verified ✅/❌
  - each page has a correct `<title>`; `robots.txt` disallows all ✅/❌ (no SEO metric — spec §14)
  - `wiki-be` CORS ticket resolved; auth + sync work against live `wiki-be` ✅/❌
  - vanilla app deleted in the same change ✅/❌
  - old service worker cleanly replaced ✅/❌

- [ ] **Step 2: List what is knowingly absent** (the `post-cutover.md` set) so the reviewer knows the gap is intentional: dashboard view, admin view, changelog view, highlights + markers, notes scratchpad, complexity-comparator.

- [ ] **Step 3: Full local check** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, all green.

- [ ] **Step 4: Checkpoint** — report. `post-cutover.md` starts next; the live site runs the reduced app in the meantime (accepted, spec §5).

**Exit criteria:** `sub-spec-3-exit.md` all ✅ (or ❌ with notes). The vanilla app is gone. The Next app is the product.
