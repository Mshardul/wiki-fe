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

- [ ] **Step 1: Record the `components/` folder rule in `CONVENTIONS.md`**

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

- [ ] **Step 2: Failing test — `modalRegistry` open-state + escape ordering**

`components/common/modalRegistry.test.ts` — register two mock modals, assert `closeTopmost()` closes the last-opened first, `anyOpen()` reflects state. Port the contract from `js/modal-registry.js` + the escape-key ordering in `js/app/mobile-panels.js` `closeTopmost`.

- [ ] **Step 3: Run, confirm failure.**

- [ ] **Step 4: Implement `modalRegistry.ts` + `useFocusTrap.ts` + `Modal.tsx`**

`modalRegistry.ts` — a module-level stack of `{ isOpen, close }`, `registerModal`, `closeTopmost`, `anyOpen`. `useFocusTrap.ts` — port `createFocusTrap` / `getFocusableIn` from `js/modal-registry.js` as a hook. `Modal.tsx` — a portal-based dialog using both, `lockBodyScroll` on open (port from `js/state.js`).

- [ ] **Step 5: Run, confirm pass.**

- [ ] **Step 6: Failing test — `lib/toast.ts` queue**

Port the queue semantics from `js/render/toast.js` (FIFO, dedupe, timeout, variant, priority arg). Test: enqueue 3, assert order + dedupe.

- [ ] **Step 7: Run, confirm failure, implement `lib/toast.ts` + `ToastHost.tsx`, run, confirm pass.**

- [ ] **Step 8: Failing test — `lib/storage/local.ts` typed store + subscribe**

Test: `set(key, value)` round-trips through `localStorage`, `subscribe(key, cb)` fires on same-tab set AND on a synthetic `storage` event (multi-tab). Wrap every read/write in try/catch (private-mode safety). Port the multi-tab `storage` listener pattern from `js/storage/settings-theme.js` and `js/storage/bookmarks.js`.

- [ ] **Step 9: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 10: Failing test — `lib/storage/data-json.ts`**

Test: `loadDataJson("glossary")` fetches `${BASE_PATH}/data/glossary.json`, validates against a zod schema, caches the result, returns `{}` (not throw) on fetch failure. One schema per file: hand-authored `glossary`, `synonyms`, `shortcuts`, `summaries`; build-generated `search-index`, `backlinks`, `previews`, `complexity-tables` (the last two consumed in later phases / `post-cutover.md` — register the schemas now).

- [ ] **Step 11: Run, confirm failure. Move `data/*.json` to `public/data/`, implement the loader, run, confirm pass.**

- [ ] **Step 12: Implement the chrome — `Topbar.tsx`, `IconTooltip.tsx`**

`Topbar.tsx` — port the topbar structure from `index.html` + `css/components/topbar.css`: breadcrumb slot, back button, title slot, icon-button row (search trigger, bookmarks trigger, settings trigger — the triggers dispatch to islands mounted later; wire as they land). `IconTooltip.tsx` — port `js/app/icon-tooltip.js` (short-delay custom tooltip, keeps native `title` fallback). Mount both in `app/layout.tsx`.

- [ ] **Step 13: Failing test — breadcrumb + page title from route**

`components/chrome/Breadcrumb.tsx` — derives crumb trail + `document.title` from the current pathname (`usePathname`). Test: `/dsa/patterns/sliding-window` → crumbs `["DSA", "Patterns", "Sliding Window"]`, title `"Sliding Window · DSA · Wiki"`. Port `updatePageTitle` + breadcrumb logic from `js/render/nav-utils.js`.

- [ ] **Step 14: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 15: `WikiSwitcher` + `ScrollToTop`**

`WikiSwitcher.tsx` — port `js/app/wiki-switcher.js` (modal listing verticals, keyboard-navigable, navigates on select). `ScrollToTop.tsx` — port the scroll-to-top button from `js/app.js` (appears past a scroll threshold). Both use `Modal` / `registerModal` where applicable. Failing test each → implement → pass.

- [ ] **Step 16: typecheck + lint + test.**

**Exit criteria:** `components/` structure recorded in `CONVENTIONS.md`. Modal registry, focus-trap, toast, typed local storage, typed `data/*.json` loader, topbar, icon tooltips, breadcrumb, wiki-switcher, scroll-to-top — all built, tested, mounted. `data/*.json` served from `public/data/`. No feature islands yet.

---

## Phase 2 — Reader islands, part 1: TOC, progress, sticky header, heading collapse, anchors, focus mode

**Goal:** the article-page navigation furniture. All islands mount onto the RSC-rendered `.markdown-body` and its `.section` wrappers (produced by `remark-section-wrap` in `content-foundation.md`).

**Files:**
- Create: `components/reader/Toc.tsx`, `ProgressRing.tsx`, `StickyHeader.tsx`, `HeadingCollapse.tsx`, `AnchorScroll.tsx`, `FocusMode.tsx`
- Create: `components/reader/ReaderIslands.tsx` — one client wrapper the article page mounts, that composes the reader islands (keeps `app/[vertical]/[...slug]/page.tsx` a thin server component)
- Modify: `app/[vertical]/[...slug]/page.tsx` — render `<ReaderIslands article={...} />` after the article HTML
- Tests: co-located

- [ ] **Step 1: Failing test — `Toc` builds from `article.headings`**

`Toc` takes `article.headings` (from `getArticle`) as a prop and renders a nested `<nav>` with `#id` links — no DOM walk, unlike `js/content/toc.js` `buildTOC`. Test: given a headings array, renders the nested nav, depth-nested.

- [ ] **Step 2: Run, confirm failure, implement `Toc.tsx`, run, confirm pass.**

- [ ] **Step 3: Failing test — `ProgressRing` reflects scroll fraction**

Port `js/app/reading-progress.js` — a scroll listener computing `scrollTop / (scrollHeight - clientHeight)`, driving a ring stroke-dashoffset + the linear `#reading-progress` bar. Test with a mocked scroll container: 0% at top, ~100% at bottom.

- [ ] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 5: Failing test — `StickyHeader` shows the current section**

Port `addStickySection` / `cleanupStickySection` from `js/content/toc.js` — an IntersectionObserver over `.section > h2` that updates a sticky label with the section currently in view. Test: scroll past section 2's heading → label reads section 2.

- [ ] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 7: Failing test — `HeadingCollapse` toggles a section body**

Port `injectHeadingCollapseToggles` from `js/content/toc.js` + the per-heading collapse from `js/content/formatting.js`. Adds a toggle button per `h2`/`h3`, collapses the following `.section-body` / `.subsection-body`, persists collapsed state per article (`lib/storage/local.ts`, key from `js/storage/scroll-collapse.js`). Test: click toggle → body hidden + state saved; remount → stays collapsed.

- [ ] **Step 8: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 9: Failing test — `AnchorScroll` smooth-scrolls to `#id` and updates URL**

Port `jumpToHeading` from `js/content/toc.js` + `addAnchorLinks` behaviour from `js/content/formatting.js` (the anchor markup is already emitted by `rehype-autolink-headings`; this island wires click → smooth scroll + `history.pushState` the hash). Test: click an anchor → scrolls, URL hash updates.

- [ ] **Step 10: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 11: Failing test — `FocusMode` dims non-central paragraphs**

Port `toggleFocusMode` / `cleanupFocusMode` from `js/content/formatting.js` — IntersectionObserver with `rootMargin: "-35% 0px -35% 0px"` toggling `.focus-para` on `FOCUS_SELECTORS` elements, `.focus-mode` on the body. Test: element in the central band gets `.focus-para`.

- [ ] **Step 12: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 13: Compose in `ReaderIslands.tsx` and mount on the article page**

`ReaderIslands.tsx` (`"use client"`) takes `{ article }`, renders `<Toc>`, `<ProgressRing>`, mounts the effect-only islands (`StickyHeader`, `HeadingCollapse`, `AnchorScroll`, `FocusMode`) which operate on `document`. Article page renders it after `dangerouslySetInnerHTML`.

- [ ] **Step 14: Local visual check** — open a real article, TOC populates, progress ring moves on scroll, sticky header tracks sections, headings collapse and persist, anchors scroll, focus mode dims. (Visual — allowed per memory.)

- [ ] **Step 15: typecheck + lint + test.**

**Exit criteria:** article-page navigation furniture works on real content. `app/[vertical]/[...slug]/page.tsx` stays a thin server component delegating to `<ReaderIslands>`.

---

## Phase 3 — Reader islands, part 2: content-body interactions

**Goal:** the in-body interactive layer — every runtime half of the `content-foundation.md` Phase 4 plugins.

**Files:**
- Create: `components/reader/CalloutCollapse.tsx`, `LatexToggle.tsx`, `TabbedCode.tsx`, `ArticleFind.tsx`, `GlossaryPopover.tsx`, `CaveatReveal.tsx`, `CodeCopy.tsx`, `LineNumbers.tsx` (may be markup-only from the plugin — verify), `ComparisonTable.tsx`, `ZoomLightbox.tsx`, `PracticeAnswerToggle.tsx`, `PrereqStatus.tsx`
- Modify: `components/reader/ReaderIslands.tsx` — add these
- Tests: co-located, each mounting on the plugin's emitted markup

For each island: **failing test on the plugin's real emitted markup → run → implement → run → full reader suite green.** Repeat all steps per island.

- [ ] **Task 3a — `CalloutCollapse`**: on `.callout[data-collapsible="true"]` (emitted by `remark-callouts`), wire a header click to expand/collapse. Port from `js/content/formatting.js` `addCollapsibleCallouts`. Test: click collapsed callout header → body shows.

- [ ] **Task 3b — `LatexToggle`**: on KaTeX `.katex` blocks, add the `αβ` button that swaps rendered LaTeX between original and variable-name-substituted form, plus a copy-LaTeX button. Port `_substituteLatex`, `VAR_MAP`, `_katexToolbar` from `js/content/formatting.js`. Needs `katex` client-side for `renderToString` on toggle — lazy-import it only when a toggle is clicked (not in the initial bundle). Test: click `αβ` → re-rendered with `\text{...}`.

- [ ] **Task 3c — `TabbedCode`**: on `.tabbed-code[data-tabs-id]` (emitted by `remark-tabbed-code`), wire tab buttons switching visible `<pre>`. Port `_buildTabWidget` from `js/content/formatting.js`. Test: two tabs, click tab 2 → pre 2 visible.

- [ ] **Task 3d — `ArticleFind`**: the in-article find bar (`/` or a button opens it), highlights matches in `.markdown-body`, next/prev. Port `ArticleFind` from `js/content/formatting.js`. Test: type a term present in the fixture → match count > 0, `.article-find-hit` marks present.

- [ ] **Task 3e — `GlossaryPopover`**: on `.glossary-term` spans (emitted by `rehype-glossary-caveat-markers`), wire hover/focus → positioned popover with the definition, click → inline expand. Port `addGlossaryTerms` / `addInlineGlossaryExpand` / `_positionPopover` from `js/content/glossary-caveats.js`. Definitions come from `loadDataJson("glossary")`. Test: hover a term → popover visible with def text.

- [ ] **Task 3f — `CaveatReveal`**: on `.caveat-marker` (emitted by the same plugin), wire click/Enter → toggle `.caveat-body` visibility + `aria-expanded`. Port `addInlineCaveats` reveal half from `js/content/glossary-caveats.js`. Test: click marker → body revealed.

- [ ] **Task 3g — `CodeCopy` + `LineNumbers`**: on `.code-header` copy button (emitted by `rehype-code-header`), wire clipboard write (with `execCommand` fallback) + toast. Port `writeToClipboard`, `addCopyButtons` from `js/content/code-blocks.js`. Line numbers: if `rehype-code-header` already emitted `.code-line` spans + `has-line-numbers`, this is CSS-only — verify; if the plugin left it for runtime, port `addLineNumbers`. Test: click copy → clipboard has the code text.

- [ ] **Task 3h — `ComparisonTable`**: on `[data-comparison]` tables (emitted by `rehype-comparison-table`), wire column-header sort (numeric/Big-O aware), column-toggle (hidden-column prefs via `lib/storage`, key from `js/storage/table-columns.js`), and horizontal scroll cues. Port `addTableSort`, `addComparisonColumnToggles`, `addTableScrollCues` from `js/content/tables.js`. Do NOT port `addQuizTables` / `QuizMode` — quiz-me is dropped (§9). Test: click a numeric column header → rows sorted ascending; toggle a column → hidden + persisted.

- [ ] **Task 3i — `ZoomLightbox`**: on `img` in `.markdown-body` and on inline diagram SVGs, wire click → full-screen overlay with pinch/pan/swipe. Port `addImageLightbox`, `addDiagramZoom`, `wireImageErrorPlaceholders` from `js/content/zoom-lightbox.js`. Test: click an image → `#zoom-overlay` visible with the image.

- [ ] **Task 3j — `PracticeAnswerToggle`**: on `.problem-answer[hidden]` (emitted by `remark-practice-answer`), add the eye button toggling visibility. Port `_wireProblem` / `_setAnswerHidden` from `js/content/practice-toggle.js`, respecting the `practiceAnswersHidden` setting default. Test: click eye → answer shown, icon swaps.

- [ ] **Task 3k — `PrereqStatus`**: on `.prereq-chip[data-prereq-path]` (emitted by `rehype-prerequisites`), add the completed/not class by looking up `lib/storage` completions for that path. Port `appendChipStatus` state half from `js/content/formatting.js` `renderPrerequisites`. Test: mark a prereq path complete → chip gets the done class on mount.

- [ ] **Step (final): typecheck + lint + test + local visual sweep** of a content-heavy real article — every interaction works.

**Exit criteria:** the full in-body interactive layer works on real articles. Quiz-me explicitly absent. `ReaderIslands.tsx` composes all reader islands.

---

## Phase 4 — Reading state, stub treatment, hover previews, related + backlinks

**Goal:** the reader's stateful + cross-article layer.

**Files:**
- Create: `components/reader/ReadTracker.tsx`, `StubTreatment.tsx`, `HoverPreview.tsx`, `RelatedArticles.tsx`, `MentionedBy.tsx`, `ReadingTime.tsx`
- Create: `lib/storage/read-tracking.ts` (local half; sync half in Phase 5)
- Modify: `ReaderIslands.tsx`, article page
- Tests: co-located

- [ ] **Step 1: Failing test — `ReadTracker` marks read + fades by days-since-read**

Port `js/storage/read-tracking.js` local half + the fade-by-days logic from `js/render/content-view.js` / `home-index.js`. On article mount past a scroll/time threshold → mark `{ path, readAt }`. A helper `daysSinceRead(path)` drives an opacity class on index cards. Test: mark read → `isRead` true; simulate 10 days → fade class applied.

- [ ] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 3: Failing test — `StubTreatment`**

`article.isStub` is already known server-side. The RSC renders a stub banner when `isStub`. This island only handles the client nicety (e.g. "coming soon" badge on index cards). Port from `js/render/content-view.js` stub branch + `home-index.js` `markStubPath`. Test: stub article → banner present in RSC output (assert in the page test, not this island); index card for a stub → "Coming soon" badge.

- [ ] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 5: Failing test — `HoverPreview` shows manifest excerpt on internal-link hover**

On `a[href^="/dsa/"]` / `a[href^="/system-design/"]` inside `.markdown-body`, hover → a positioned card with that article's `title` + `excerpt` from the manifest (`getManifest()` data passed to the client as a lookup map, or a small `public/previews.json` emitted by the build). Port `js/render/content-view.js` hover-preview wiring + `js/render/nav-utils.js` path resolution. Test: hover an internal link → preview card with the target's excerpt.

- [ ] **Step 6: Run, confirm failure. Use `previews.json` — emitted by `content-foundation.md` Phase 7 Step 13a, copied to `public/` and SW-precached. Load it via `loadDataJson("previews")` (add a zod schema). Implement, run, confirm pass.**

- [ ] **Step 7: Failing test — `RelatedArticles` + `MentionedBy`**

`RelatedArticles` renders `getRelated(vertical, slug)` (same-section ranking, ported `_rankRelated` — already in `lib/content` from `content-foundation.md` Phase 7). `MentionedBy` renders `getBacklinks(article.path)` as a text panel (the "Mentioned by" spine — kept, not a graph). Both can be **server-rendered** — they take no client state. Prefer rendering them in the RSC page; an island only if completion-state styling is needed. Test: article with known backlinks → panel lists them with titles + links.

- [ ] **Step 8: Run, confirm failure, implement (in the RSC page where possible), run, confirm pass.**

- [ ] **Step 9: `ReadingTime`** — `article.readingTimeMin` is known server-side; render it in the RSC hero. No island unless it needs live update. Add to the page component.

- [ ] **Step 10: typecheck + lint + test + visual check.**

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

- [ ] **Step 1: Failing test — `lib/api.ts` base-URL detection + `ApiError`**

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

- [ ] **Step 2: Run, confirm failure.**

- [ ] **Step 3: Implement `lib/api.ts`** — port `js/api.js` endpoint-for-endpoint. Typed request/response interfaces for every endpoint (`auth.me`, `auth.login`, `auth.register`, `auth.verifyEmail`, `auth.logout`, `auth.resendVerification`, `bookmarks.*`, `recents.*`, `readTracking.*`, `completions.*` — enumerate from `js/api.js`). Global 401 → dispatch a `wiki:session-expired` event + `setSessionToken(null)`. No framework coupling (spec §2).

- [ ] **Step 4: Run, confirm pass.**

- [ ] **Step 5: Failing test — cache-through for one domain (bookmarks)**

Contract (from spec §5, ported from `js/storage/*` + `Sync`):
- read: return the local value immediately; kick a background API refresh that updates local + notifies subscribers
- write: update local + notify synchronously; fire the API call and forget (no await in the UI path)
- offline / BE-down: local still works; queued writes retry on reconnect (or are simply best-effort — match today's behaviour, check `js/storage/settings-theme.js` `Sync`)
Test: `addBookmark` updates local synchronously; the API call is fired; a failing API call does not throw into the caller.

- [ ] **Step 6: Run, confirm failure.**

- [ ] **Step 7: Implement `lib/storage/sync.ts` + the sync half of each domain module** — port `Sync` (`pull`, `push`, `clearUserDataCache`, the per-domain merge on login) from `js/storage/settings-theme.js`. Each domain module (`bookmarks.ts`, `recents.ts`, `read-tracking.ts`, `completions.ts`) gets: local CRUD (Phase 1/4) + `syncPull()` + fire-and-forget `syncPush()`.

- [ ] **Step 8: Run, confirm pass. Repeat Steps 5–7 for `recents`, `read-tracking`, `completions`.**

- [ ] **Step 9: `useSession` + `useSyncedDomain` hooks** — `useSession` subscribes to `wiki:session-changed` / `wiki:session-expired` and the multi-tab `storage` event (port the `SESSION_SYNC_KEY` listener from `js/auth.js`), exposes `{ user, status }`. `useSyncedDomain(name)` gives a component the local value + a setter that goes through cache-through. Test both.

- [ ] **Step 10: `BookmarksModal` (⌘B)** — port `js/app/bookmarks-modal.js`: modal listing bookmarks, focus trap, entry click → navigate, empty state. Reads `lib/storage/bookmarks.ts`. Failing test → implement → pass.

- [ ] **Step 11: typecheck + lint + test.**

**Exit criteria:** `lib/api.ts` is a complete typed `wiki-be` client, client-direct, no Next coupling. Cache-through works for all four synced domains — local-first, fire-and-forget writes, graceful offline. Multi-tab session sync works. ⌘B bookmarks modal ported.

---

## Phase 6 — Auth UI

**Goal:** login / register / email-verify / logout, the live 5-rule password checklist, anon→logged-in migration. Ported from `js/auth.js`.

**Files:**
- Create: `components/auth/AuthModal.tsx`, `PasswordChecklist.tsx`, `lib/auth/passwordRules.ts`
- Modify: `components/chrome/Topbar.tsx` — auth button wired to open the modal
- Tests: co-located

- [ ] **Step 1: Failing test — `passwordRules.ts` 5-rule validation**

```ts
import { validatePassword } from "./passwordRules";
// exact rules from js/auth.js PW_RULES:
// len >= 12, /[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/
```
Test each rule independently + the `valid` aggregate. Values copied verbatim from `js/auth.js` `PW_RULES` (labels included — "At least 12 characters", "A special character ( ! @ # $ % ^ & * ? - _ )", etc.). Keep-in-sync note pointing at `docs/_meta/auth.md` (spec / repo rule).

- [ ] **Step 2: Run, confirm failure, implement `passwordRules.ts`, run, confirm pass.**

- [ ] **Step 3: Failing test — `PasswordChecklist` updates live**

Renders the 5 rules, each with a pass/fail marker that updates on every keystroke. Test: type `"short"` → all fail; type `"LongEnough1!xx"` → all pass.

- [ ] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 5: Failing test — `AuthModal` panel switching**

Panels: login, register, verify, forgot, reset (from `js/auth.js` `AuthModal._swap`). Test: open on login → click "create account" → register panel; register success → verify panel.

- [ ] **Step 6: Run, confirm failure.**

- [ ] **Step 7: Implement `AuthModal.tsx`** — port `js/auth.js` `AuthModal`: the five panels, `_swap`, form submit → `api.auth.*`, error rendering (map `ApiError.code` to messages as `js/auth.js` does), the `NETWORK` "Failed to fetch" special-case. Uses `Modal.tsx` + `useFocusTrap`. On login/register success: run the anon→logged-in migration.

- [ ] **Step 8: Failing test — anon→logged-in migration**

On first login, local bookmarks/recents/completions created while anonymous are pushed to the API and merged (port the migration from `js/auth.js` — `flushBootMutations`, `Sync.push` per domain, `discardBootMutations` on failure). Test: seed local bookmarks anon → login → `api.bookmarks.add` called for each.

- [ ] **Step 9: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 10: Wire the topbar auth button** — shows "Sign in" when out, user menu (logout) when in. `useSession` drives it. Port `Auth.refreshButtons` from `js/auth.js`.

- [ ] **Step 11: typecheck + lint + test + visual check** — open modal, checklist updates live, register→verify flow, login persists across reload, logout clears.

**Exit criteria:** full auth UI ported. Password checklist matches `wiki-be`'s 5 rules exactly. Anon→logged-in migration works. Multi-tab logout catches up.

---

## Phase 7 — Search

**Goal:** ⌘K modal, client-side index from the build output, synonym expansion, fuzzy scoring, section-filter (`>`), snippet extraction, recent searches. Ported from `js/search/`.

**Files:**
- Create: `components/search/SearchModal.tsx`, `lib/search/index.ts` (index load + build from `search-index.json` / manifest), `lib/search/score.ts`, `lib/search/snippet.ts`, `lib/search/synonyms.ts`
- Create: `lib/storage/recent-searches.ts` (ported `RecentSearches` from `js/storage/scroll-collapse.js`)
- Modify: `Topbar.tsx` — search trigger; `app/layout.tsx` — mount `<SearchModal>`; keyboard shortcut (⌘K)
- Tests: co-located

- [ ] **Step 1: Failing test — `score.ts` scoring ladder**

Port `scoreMatch` from `js/search/search.js` exactly: title exact=100, startsWith=90, includes=80, fuzzy=60, (not-short) desc includes=40, desc fuzzy=20, section fuzzy=10; `expandQuery` synonym expansion; the `short = ql.length <= 4` guard. Test each rung with crafted entries.

- [ ] **Step 2: Run, confirm failure, implement `score.ts` + `synonyms.ts` (synonyms from `loadDataJson("synonyms")`), run, confirm pass.**

- [ ] **Step 3: Failing test — `snippet.ts` sentence-based extraction**

Port `extractSnippet` / `_sentences` from `js/search/search-features.js` — pick the sentence(s) containing the most query terms, ellipsize. Test: a paragraph + a query term → snippet centred on that term.

- [ ] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 5: Failing test — `lib/search/index.ts` builds entries from build output**

The search index is `content/search-index.json` (now Node-generated, `content-foundation.md` Phase 7) plus manifest data for sections. Test: `loadSearchEntries()` returns one entry per non-stub article with `{ title, path, slug, section, description }`.

- [ ] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 7: Failing test — `SearchModal` behaviour**

Port `js/search/search.js` modal lifecycle: open (⌘K / trigger), close (Esc / backdrop), typeahead results ranked by `score.ts`, arrow-key selection wrapping to the input at the top, Enter navigates (`next/navigation` `router.push`), section-filter mode when the query starts with `>` (`section-mode` class, filters to sections), recent searches shown on empty query, remove-recent. Uses `Modal` + `registerModal`. Test: type a known article title → it ranks first; `>patterns` → section results; arrow down + Enter → navigates.

- [ ] **Step 8: Run, confirm failure, implement `SearchModal.tsx`, run, confirm pass.**

- [ ] **Step 9: Wire ⌘K globally** — a `keydown` listener in `app/layout.tsx` (or a `useHotkey` hook) opens the modal; respects "don't trigger while typing in an input". Port from `js/app.js` keyboard-shortcut wiring (only the search shortcut here; the full shortcut set is Phase 9).

- [ ] **Step 10: typecheck + lint + test + visual check** — ⌘K opens, results rank sensibly, synonyms work ("map" finds "hash table"), `>` filters sections, recents persist.

**Exit criteria:** search fully ported, scoring ladder identical to today, synonyms + section-filter + snippets + recents all work, client-side index from the Node build output.

---

## Phase 8 — Home + index views: cards, sections, swipe, pull-to-refresh, key nav, learning-path bars

**Goal:** the home and vertical-index interactivity on top of the RSC-rendered pages from `app-skeleton.md`.

**Files:**
- Create: `components/home/IndexCardSwipe.tsx`, `PullToRefresh.tsx`, `KeyNav.tsx`, `LearningPathBars.tsx`, `RecentsStrip.tsx`, `BookmarksStrip.tsx`
- Create: `lib/content/learning-paths.ts` — parse learning-track tables (may already exist from `content-foundation.md` `getVerticalIndex`; verify — if so, reuse)
- Modify: `app/page.tsx`, `app/[vertical]/page.tsx` — mount the islands; `RecentsStrip` / `BookmarksStrip` render from `lib/storage`
- Tests: co-located

- [ ] **Step 1: Failing test — `LearningPathBars` per-track completion**

`getVerticalIndex(id).learningPaths` gives tracks + rows. This island computes `completed / total` per track from `lib/storage` completions and renders a bar. Port `js/render/learning-paths.js`. Test: a track with 2 of 4 rows complete → 50% bar.

- [ ] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 3: Failing test — `IndexCardSwipe` (mobile) bookmark/read toggle**

Port `js/render/home-gestures.js` index-card swipe: swipe-right → bookmark toggle, swipe-left → read toggle, gated to mobile viewport (`<= 900`, from `mobile-panels.js` `GESTURE_MOBILE_MAX`). Test with synthetic touch events: swipe right on a card → bookmark added.

- [ ] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 5: Failing test — `PullToRefresh`**

Port `js/render/home-gestures.js` pull-to-refresh — at scrollTop 0, drag down past a threshold → re-fetch index data (here: revalidate `lib/storage` synced domains + re-render). Test: simulate the gesture → refresh callback fires.

- [ ] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 7: Failing test — `KeyNav` arrow-key card navigation**

Port `js/render/home-index.js` key nav — arrow keys move focus between cards, Enter/Space activates, respects grid wrapping. Test: focus card 1, ArrowRight → card 2 focused.

- [ ] **Step 8: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 9: `RecentsStrip` + `BookmarksStrip`** — render from `lib/storage/recents.ts` / `bookmarks.ts`, on the index view. Port the section renders from `js/storage/recents.js` / `bookmarks.js`. Client islands (need local state). Test: seed recents → strip shows them newest-first.

- [ ] **Step 10: typecheck + lint + test + visual check** — home cards keyboard-navigable, index swipe works on a narrow viewport, pull-to-refresh, learning-path bars accurate, recents/bookmarks strips populate.

**Exit criteria:** home + index interactivity ported. Learning-path progress accurate. Mobile gestures gated correctly.

---

## Phase 9 — Settings, per-article local prefs, keyboard shortcuts, print

**Goal:** theme + preferences modal, distraction-free, keyboard-shortcuts tab, print stylesheet + trigger, "clear my data", per-article table-column + scroll/collapse prefs.

**Files:**
- Create: `components/settings/PreferencesModal.tsx`, `ThemeControls.tsx`, `DistractionFree.tsx`, `PrintTrigger.tsx`, `ClearData.tsx`, `KeyboardShortcutsTab.tsx`
- Create: `lib/storage/settings.ts` (ported `Settings` + `Theme` from `js/storage/settings-theme.js`), `lib/hotkeys.ts`
- Modify: `app/layout.tsx` — mount modal + apply settings on load + OS theme listener; keep `css/print.css` in the import chain
- Tests: co-located

- [ ] **Step 1: Failing test — `lib/storage/settings.ts` + theme application**

Port `Settings` / `Theme` / `applySettingsToDOM` / `initOsThemeListener` from `js/storage/settings-theme.js`. Theme = light / dark / system; background presets are **computed** (`--bg`/`--surface`/`--accent` set in JS, not named `data-theme` blocks — spec §3 / `css/themes.css` note). Multi-tab: `SETTINGS_KEY` `storage` event re-applies. Test: set theme dark → `data-theme="dark"` on root; set a bg preset → CSS vars updated; system + OS dark → dark applied.

- [ ] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 3: Apply settings in the root layout** — an inline script (pre-hydration, to avoid a flash) reads the theme from `localStorage` and sets `data-theme` + computed vars before first paint. Port the boot theme logic from `index.html`'s inline `<script>` (line ~34).

- [ ] **Step 4: Failing test — `PreferencesModal` tabs**

Port from `js/storage/settings-theme.js` swatches + `css/components/preferences-modal.css`: theme tab, a keyboard-shortcuts tab, a "clear my data" action. Test: open → theme tab default; switch to shortcuts tab → shortcut list rendered.

- [ ] **Step 5: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 6: `DistractionFree`** — port `js/app/distraction-free.js` — toggle hides chrome, `Esc` exits. Test: toggle → `.distraction-free` on body.

- [ ] **Step 7: `PrintTrigger` + print stylesheet** — `css/print.css` stays in the `wiki.css` import chain (already there). `PrintTrigger` calls `window.print()` after expanding collapsed regions. Port `js/app/print.js`. Test: trigger → collapsed sections expanded, `print` called.

- [ ] **Step 8: `ClearData`** — port `js/storage/data-clear.js` — wipes bookmarks/highlights/notes/pinned-wikis from local (highlights/notes keys exist even though those features are `post-cutover.md` — clear them anyway for forward-compat, or scope to what exists; match `data-clear.js`). Confirm dialog first. Test: confirm → keys removed.

- [ ] **Step 9: `lib/hotkeys.ts` + full keyboard shortcut set** — port the shortcut map from `js/app.js` (⌘K search, ⌘B bookmarks, `g`/`Shift+G` were graph — DROPPED, omit them, `?` help, `/` find, theme toggle, etc.). A single `keydown` handler, "not while typing" guard, respects `prefers-reduced-motion` where relevant. Test: each live shortcut fires its action; dropped ones are absent.

- [ ] **Step 10: Per-article local prefs** — table-column prefs (`lib/storage/table-columns.ts`, done in Phase 3h) + scroll-position / section-collapse cache (`lib/storage/scroll-collapse.ts`, ported from `js/storage/scroll-collapse.js`). On article mount, restore scroll + collapse state; on unmount/scroll, save. Test: scroll an article, navigate away, back → scroll restored.

- [ ] **Step 11: typecheck + lint + test + visual check** — theme switches with no flash, presets work, distraction-free, print expands collapsibles, clear-data works, shortcuts fire, scroll position restores.

**Exit criteria:** settings + preferences fully ported, theme applies pre-paint (no flash), keyboard shortcuts match today minus the dropped ones, per-article prefs persist.

---

## Phase 10 — Mobile: TOC drawer, swipe gestures, panel-close registry, viewport handling

**Goal:** the mobile interaction layer. Much of the gesture logic is shared with Phases 2/8 islands; this phase is the mobile-specific drawer + the cross-cutting registries.

**Files:**
- Create: `components/mobile/TocDrawer.tsx`, `SwipeGestures.tsx`, `PanelCloseRegistry.tsx`, `ViewportHandler.tsx`
- Modify: `ReaderIslands.tsx` (TOC becomes a drawer on mobile), `app/layout.tsx` (mount the registries)
- Tests: co-located

- [ ] **Step 1: Failing test — `TocDrawer` opens/closes on mobile**

Port `js/app/mobile-panels.js` TOC drawer — on `<= 900px`, the TOC is a slide-in drawer with a toggle button; `Esc` / backdrop / swipe closes it. Test: mobile viewport, click toggle → drawer open; `closeTopmost()` → drawer closes first (registry ordering from `js/app/mobile-panels.js`).

- [ ] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 3: Failing test — `SwipeGestures` edge-swipe-back + panel-close**

Port the `bindSwipeGestures` IIFE from `js/app/mobile-panels.js`: constants `SWIPE_THRESHOLD=50`, `EDGE_ZONE=44`, `DEADZONE=8`, `axisLock(dx,dy)`, left-edge swipe → history back, right-edge swipe → forward, gated mobile-only, lightbox owns its own gestures (skip when target is in `#zoom-overlay`). Test: synthetic left-edge swipe past threshold → `history.back` called.

- [ ] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 5: `PanelCloseRegistry`** — the shared "what does Esc / back-gesture close next" stack. Port `closeTopmost` from `js/app/mobile-panels.js` — order: mobile TOC → auth modal → wiki switcher → bookmarks modal → search modal → ... Unifies with `modalRegistry` from Phase 1. Test: multiple panels open → `closeTopmost` closes in the defined order.

- [ ] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 7: `ViewportHandler`** — port the resize handler from `js/app/mobile-panels.js`: debounced 150ms, closes mobile TOC + search on a significant width change, clears stale hover-preview position, re-renders Mermaid on width change **if** the spike-fail client-island path is in use (if build-time SVG, Mermaid re-renders via CSS and needs no JS here — note the branch). Also `visualViewport` handling for the mobile keyboard. Test: fire a resize crossing the breakpoint with the TOC open → TOC closed.

- [ ] **Step 8: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 9: typecheck + lint + test + mobile visual check** (DevTools device mode) — TOC drawer, edge-swipe nav, panel-close ordering, resize behaviour.

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

- [ ] **Step 1: Failing test — `lib/pwa/article-cache.ts`**

Port `js/storage/offline.js`: `saveArticle(path)` fetches the article HTML + its page-specific assets and `cache.put`s them into `wiki-articles`; `evictArticle(path)` deletes them; `isSaved(path)`; `listSaved()` returns `{ path, cachedAt }[]`. Test (mock `caches`): save → entry present; evict → gone.

- [ ] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 3: `SaveOffline` island** — a button on the article page: "Save for offline" ↔ "Saved" ↔ evict, driven by `article-cache.ts`, toast on completion. Port the button-state logic from `js/storage/offline.js` `updateOfflineBtn`. Test: click → `saveArticle` called, button flips to "Saved".

- [ ] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 5: Real `/offline` shelf** — `app/offline/page.tsx` becomes a client page listing `listSaved()` with last-cached date + a per-article evict button + a dimmed state for the currently-offline case. Port `js/render/offline-view.js`. Test: two saved articles → both listed; click evict → removed from the list.

- [ ] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 7: `InstallPrompt` + `IosNudge`** — port `js/app/install-prompt.js` + `js/storage/install-prompt.js`: capture `beforeinstallprompt`, show a banner; iOS gets an "Add to Home Screen" nudge toast (dismissal persisted in `localStorage`). Test: fire `beforeinstallprompt` → banner shows; dismiss → flag set, no re-show.

- [ ] **Step 8: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 9: typecheck + lint + test + offline visual check** — save an article, go offline, confirm it opens; evict it, confirm the offline fallback; install banner appears.

**Exit criteria:** explicit save/evict works over the `wiki-articles` cache; `/offline` shelf lists saved articles with dates + evict; install + iOS nudge ported. The spec §8 model is complete end to end.

---

## Phase 12 — Reader-facing metadata + `robots: Disallow: /`

**Goal:** per-page `<title>` + description + canonical link — **for the reader** (browser tabs, bookmarks, history, link-sharing), not for crawlers. No sitemap, no structured data, no OG images, no Lighthouse SEO gate. `robots` disallows all. Full SEO is the public-launch epic (spec §14). (spec §1, §14, overview.md "Per-page metadata" rule)

**Files:**
- Modify: `app/[vertical]/[...slug]/page.tsx` — `generateMetadata`
- Modify: `app/page.tsx`, `app/[vertical]/page.tsx` — `generateMetadata`
- Create: `app/robots.ts`
- Tests: co-located

- [ ] **Step 1: Failing test — article `generateMetadata`**

```tsx
export async function generateMetadata({ params }): Promise<Metadata> { /* ... */ }
```
Test: for a real slug, returns `title` = `"<article title> · <vertical> · Wiki"`, `description` = the article excerpt, `alternates.canonical` = `${CANONICAL_BASE}/<vertical>/<slug>/`. No `openGraph` block needed (not public). `robots: { index: false, follow: false }` in the metadata so even if the page is fetched it is not indexed.

- [ ] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [ ] **Step 3: Home + vertical `generateMetadata`** — sensible titles/descriptions, same `robots: { index: false }`. Test.

- [ ] **Step 4: `app/robots.ts`** — `Disallow: /`. No sitemap reference (there is no sitemap). Confirm `next build` writes `out/wiki-fe/robots.txt` with the disallow.

- [ ] **Step 5: Build + confirm** — each of 3 article routes has a correct `<title>` in the browser tab and a canonical link in the HTML; `robots.txt` disallows all. **No Lighthouse SEO check** — it is not a gate (spec §14).

- [ ] **Step 6: typecheck + lint + test.**

**Exit criteria:** every route has a reader-facing `<title>` + description + canonical link and `robots: index:false`. `robots.txt` disallows all crawlers. No sitemap. No SEO metric checked.

---

## Phase 13 — e2e selector sweep (shipped-features subset)

**Goal:** get the Python e2e suite passing against the Next build for the cutover-critical feature set. Selectors and URLs change (hash → real paths); test logic is preserved (spec §10).

**Files:**
- Modify: `tests/conftest.py` — base URL, navigation helpers (read it first; no new fixtures — repo rule)
- Modify: the `tests/e2e/test_*.py` files covering shipped features (see the list below)
- Do NOT touch: tests for deferred features (`test_dashboard.py`, `test_admin.py`, `test_changelog.py`, `test_notes_scratchpad.py`, `test_complexity_comparator.py`, `test_section_map.py`) — those come back in `post-cutover.md`. Tests for dropped features (quiz-me parts of `test_content_enhancements.py`, graph parts of `test_navigation_polish.py`) — delete those specific test functions with a one-line note.

- [ ] **Step 1: Read `tests/conftest.py` in full** — understand the fixtures (browser setup, local HTTP server, navigation helpers). The local server must now serve the Next `out/` build (or run `next dev`) instead of the static repo root.

- [ ] **Step 2: Update `conftest.py`** — point the server fixture at the built site under `/wiki-fe/`; update `navigate(path)` helpers to real paths (`/dsa/patterns/x` not `#/dsa/x`). No new fixtures.

- [ ] **Step 3: Sweep, one test file at a time.** For each shipped-feature file — `test_home.py`, `test_search.py`, `test_navigation.py`, `test_content.py`, `test_content_enhancements.py` (minus quiz-me), `test_html_markup.py`, `test_bookmarks.py`, `test_auth.py`, `test_recents.py`, `test_settings.py`, `test_routing_pathing.py`, `test_links.py`, `test_scroll_toc.py`, `test_keyboard_scroll.py`, `test_a11y_hotkeys.py`, `test_navigation_polish.py` (minus graph), `test_offline_shelf.py`, `test_structure_viz.py`, `test_toc_overhaul.py`, `test_touch_gestures.py`, `test_ux_hotkeys_errors.py`, `test_read_toggle.py`, `test_index_ux.py`, `test_data_backup.py`, `test_content_width.py`, `test_line_numbers_pathing_help.py`, `test_security.py`, `test_behavioral_fixes.py` — update selectors/URLs, run it (`.venv/bin/python3 -m pytest tests/e2e/test_x.py -v`), fix until green.

- [ ] **Step 4: Delete dropped-feature test functions** — quiz-me tests, graph-overlay tests, parallax/study-feedback/debug-overlay/freeze-frame tests. One-line note per deletion pointing at spec §9.

- [ ] **Step 5: Run the full shipped-subset** — `.venv/bin/python3 -m pytest tests/e2e/ -v` excluding the deferred-feature files. All green. (The user runs the full suite themselves per repo rule — this step is the plan confirming the subset.)

**Exit criteria:** the Python e2e subset covering cutover-critical features passes against the Next build. Deferred-feature tests untouched (still red / skipped, expected). Dropped-feature tests removed.

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
      # match the build job's Mermaid choice
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out
      - id: deployment
        uses: actions/deploy-pages@v4
```
(If the client-island Mermaid fallback is in use, drop the `playwright install` line.)

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
  - Python e2e subset (shipped features) passes against the Next build ✅/❌ + run evidence
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
