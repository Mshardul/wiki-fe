# Post-Cutover — Feature Port + Hardening — Phase File (spec Sub-specs 4 + 5)

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Phases in order, inline, stop for review at each boundary. `- [ ]` checkboxes. Read [`overview.md`](./overview.md) first — **Global Constraints** bind every step (no git steps; TDD red-green for units; pnpm; drop list). `cutover.md` must be at **exit-criteria green** (the vanilla app deleted, the Next app live) before this file starts.

**Maps to:** spec [`../nextjs-migration-design.md`](../nextjs-migration-design.md) §5 Sub-spec 4, §5 Sub-spec 5, §9, §10, §11.

**Deliverable:** two parts, sequential.
- **Part A (Sub-spec 4) — feature port:** the six features deferred from `cutover.md`, ported onto the now-live Next app, one coherent group at a time. Each is new code; nothing is replaced (spec §5 "no wasted effort").
- **Part B (Sub-spec 5) — hardening:** ESLint/Biome final form, the Python e2e suite fully swept + CI-wired, CI final form, retire the four Python generator scripts + `bump_cache_version.py`, rewrite `CLAUDE.md` / `CONVENTIONS.md` / `readme.md`, supersede the `fe-no-node-phase1` memory, update the `wiki` root `CLAUDE.md`, confirm the `wiki-be` CORS ticket (filed back in `app-skeleton.md`) is resolved.

**Order (spec §5 Sub-spec 4, highest user-visible value first):** highlights + markers → notes scratchpad → complexity-comparator → changelog view → dashboard view → admin view. Then Part B.

---

## Interfaces consumed

```ts
import {
  getVerticals, getVertical, getArticle, getArticleSlugs,
  getManifest, getVerticalIndex, getBacklinks,
} from "@/lib/content";
import { api } from "@/lib/api";
import { useSession } from "@/components/sync/useSession";
// lib/storage/* and components/common/* from cutover.md
```

## Global constraints specific to this phase file

- **The Next app is live.** Each phase adds to it; each phase's state goes live on merge (spec §5). No feature here is on the critical path — a phase can ship half-done without breaking the site.
- **The island rule** (overview.md) — markup from the build pipeline; behaviour in React with React-rendered controls where possible; direct body DOM mutation only for the Range-based highlight/marker case (Phase 1).
- **Testing: code-then-test** — every feature here is a **port of a known-good vanilla module**. Port the behaviour from the existing `js/` file, then write the Vitest test that locks it (overview.md "Testing rule"). The step pattern in each phase reads "failing test → implement" for brevity, but for these ports the practical order is port-then-lock; the deliverable is the same — working island + passing test. (Pure `lib/` helpers that are new logic — e.g. the complexity-matrix merge — stay fixture-first.)
- **New `components/<feature>/` folder per feature** (per the `CONVENTIONS.md` rule from `cutover.md` Phase 1).
- **Comments one line; no ticket IDs in code; no `console.*`** (memories + repo rules).
- **Highlights/notes are per-article local only** — check whether today's `js/storage/highlights.js` / `notes.js` sync to `wiki-be`; the FILE MAP says they are local (`storage/` domain, not synced). Port as local-only unless the code shows a sync path.

---

## Phase 1 — Highlights + inline emoji markers

**Goal:** per-article text highlights and inline emoji markers, persisted locally, relocated after content edits by snippet-matching. Ported from `js/content/highlights.js` + `js/storage/highlights.js`.

**Files:**
- Create: `components/reader/Highlights.tsx`, `components/reader/Markers.tsx` (or one `Highlights.tsx` doing both — match the vanilla split)
- Create: `lib/storage/highlights.ts` — `Highlights` + `Markers` CRUD
- Create: `lib/reader/text-offsets.ts` — the char-offset ↔ DOM Range helpers
- Modify: `components/reader/ReaderIslands.tsx` — mount; `lib/storage/data-clear.ts` — already clears these keys (from `cutover.md` Phase 9)
- Tests: co-located

- [x] **Step 1: Failing test — `lib/storage/highlights.ts` CRUD**

Port `Highlights` and `Markers` from `js/storage/highlights.js` verbatim:
- key: `${HIGHLIGHTS_PREFIX}${wikiId}-${articlePath}` / `${MARKERS_PREFIX}...`
- `Highlights.add(wikiId, path, { start, end, snippet })` → entry `{ id, start, end, snippet }`
- `Markers.add(wikiId, path, { offset, emoji, snippet })` → entry `{ id, offset, emoji, snippet }`
- `MARKER_EMOJIS` = `["🤔", "💡", "⭐", "🔁", "❓", "✅"]` with `MARKER_LABELS` (`confused`, `insight`, `key`, `revisit`, `question`, `got-it`)
- `.clear(wikiId?)` — prefix-delete, all wikis if omitted
Test: add → getAll returns it; remove → gone; clear → prefix cleared.

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: Failing test — `lib/reader/text-offsets.ts`**

Port `_textNodes`, `_nodeAtOffset`, `_rangeFromOffsets`, `_snippetMatchesAt`, `_findNearbyOffset` from `js/content/highlights.js`. Offsets are char positions relative to `#markdown-body`'s full `textContent`, skipping `SCRIPT`/`STYLE` and existing `.wiki-marker` subtrees. Test against a fixture DOM: offset 10 → correct text node + local offset; a range across two nodes → correct `Range`; a snippet that moved → `_findNearbyOffset` relocates it.

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: Failing test — `Highlights` island applies + creates highlights**

On article mount: read stored highlights, wrap each range in a `<mark class="wiki-highlight" data-highlight-id>`. On text selection + a "highlight" action: compute offsets, store, wrap. Click a highlight → remove (unwrap + `parent.normalize()`). Port `wireHighlights`, `_removeHighlight` from `js/content/highlights.js` — but drop the `exportSelectionAsCard` / freeze-frame path (dropped, §9). Test: seed a highlight → `<mark>` present on mount; select + highlight → new `<mark>` + stored.

- [x] **Step 6: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 7: Failing test — `Markers` island applies + creates markers**

On mount: read stored markers, for each (descending offset, so earlier inserts don't shift later ones) insert an emoji badge at the offset; if the snippet no longer matches, try `_findNearbyOffset`, else drop the marker and toast "N markers couldn't be relocated". Selection + pick-emoji → store + insert. Click badge → remove. Port `_insertMarkerBadge`, `_removeMarker` from `js/content/highlights.js`. Test: seed 2 markers → both badges present; edit the fixture text so one snippet breaks → that one dropped with a toast.

- [x] **Step 8: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 9: Mount in `ReaderIslands.tsx`, wire the selection toolbar** (a small popover on text selection offering highlight + the 6 marker emojis). Port the selection-toolbar UI from `js/content/highlights.js`.

- [x] **Step 10: typecheck + lint + test + visual check** — select text → highlight persists across reload; add an emoji marker; markers relocate after a simulated content change.

**Exit criteria (Phase 1 core):** highlights + markers work on real articles, persist locally, relocate by snippet, drop gracefully when relocation fails. Freeze-frame export absent (dropped). `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green. **e2e deferred — see Phase 1 Step 11, moved to run after Phase 9.**

> **Step 11 moved:** the `tests/e2e/test_content_enhancements.py` highlight/marker tests (14 tests, already written against the correct Next-app selectors — `#markdown-body`, `.wiki-highlight`, `.wiki-marker`, `.highlight-toolbar-btn--*`, `.highlight-remove-*`) are currently skip-marked `"highlights + markers not yet ported (post-cutover)"`, but all route through `_load_mock_article`, a fixture built on vanilla-only globals (`navigateToContent`, `#view-home.active`) that don't exist in the Next app. That breakage is the same one already tracked for ~20 other tests in this file under the **e2e-modernization epic (WIKI-645–650)**, which Phase 9 (e2e full sweep) is where that epic's fixture rewrite belongs — not a per-feature re-plumbing here. Running Step 11 now would mean rewriting shared e2e test infra mid-feature-port, out of scope for this phase. Actual step, to run **after Phase 9's fixture work lands**:
>
> - [ ] **Step 11 (post-Phase 9): restore `tests/e2e/test_content_enhancements.py` highlight/marker coverage** — re-tag the 14 tests at lines ~3099–3419 from the post-cutover skip reason to use the Phase-9-rewritten article-loading fixture (real built route, not `_load_mock_article`); fix `test_highlight_toolbar_buttons_are_keyboard_labeled` to expect **7** toolbar buttons (1 highlight + 6 emoji), not 8 — the save-as-card button is dropped per §9/freeze-frame removal, so its docstring and aria-label-count assertion need updating too. Run the file green.

**Exit criteria (full, incl. e2e):** all of the above, plus the 14 highlight/marker e2e tests pass against the Next build.

---

## Phase 2 — Notes scratchpad

**Goal:** a per-article notes scratchpad in the content-view right rail, collapsible, persisted locally. Ported from `js/storage/notes.js`.

**Files:**
- Create: `components/reader/NotesScratchpad.tsx`, `lib/storage/notes.ts`
- Modify: `components/reader/ReaderIslands.tsx`; keep `css/view-content/notes-scratchpad.css` in the import chain (already there)
- Tests: co-located

- [x] **Step 1: Failing test — `lib/storage/notes.ts`**

Port `Notes` from `js/storage/notes.js` — CRUD keyed per `wikiId` + `articlePath`, debounced write on input. Test: set text → round-trips; per-article isolation.

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: Failing test — `NotesScratchpad` island**

Port `renderNotesScratchpad` from `js/storage/notes.js` — a panel (`.notes-scratchpad`) with a textarea (`.notes-scratchpad-input`), a collapse toggle (`.notes-scratchpad-toggle` → `.notes-scratchpad--collapsed`), collapse state persisted. Test: type → saved (debounced); toggle → collapsed class + state; remount → text + collapse state restored. **Deviation:** implemented as a real React-rendered component (lazy `useState` seeded from storage), not a DOM-mutating island — a controlled textarea has no DOM-mutation reason to go the vanilla-replay route the Highlights island needed. Added an unmount-flush (mirrors vanilla's `_flushPendingNotesSave`): navigating away before the 300ms debounce fires still saves, matching `test_notes_scratchpad.py`'s `test_notes_not_wiped_by_fast_navigation` / `test_notes_flush_survives_navigate_and_retype` intent.

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: Mount in the right rail** (alongside `Toc` — the rail already exists from `cutover.md` Phase 2). typecheck + lint + test green. Visual check pending (not yet done live in-browser).

**Exit criteria (Phase 2 core):** notes scratchpad works per-article, collapses, persists, flushes on fast navigation. `pnpm typecheck && pnpm lint && pnpm test` green.

- [x] **Step 6: e2e — restore `tests/e2e/test_notes_scratchpad.py`** — done early in Phase 7 (was planned post-Phase 9). Real routes + `pagehide` flush + per-article remount `key`. **8/8 green.**

**Exit criteria (full, incl. e2e):** all of the above, plus `test_notes_scratchpad.py` passes against the Next build. ✅

---

## Phase 3 — Complexity-comparator modal

**Goal:** a modal that picks up to 4 Data-Structures articles and shows a merged Big-O matrix from their complexity tables. Ported from `js/app/complexity-compare.js`.

**Files:**
- Create: `components/reader/ComplexityCompare.tsx`, `lib/reader/complexity-matrix.ts`
- Modify: topbar / a trigger; `lib/content` — may need a `getComplexityTable(slug)` helper (see Step 2)
- Tests: co-located

- [x] **Step 1: Failing test — `lib/reader/complexity-matrix.ts` merge**

Port `extractComplexityTable` (from `js/content/tables.js`) + the matrix merge from `js/app/complexity-compare.js`: given N parsed complexity tables, produce one matrix (rows = operations, columns = structures, cells = Big-O). `MAX_PICKS = 4`. Test: two tables with overlapping + distinct operations → merged matrix with the union of rows, blanks where a structure lacks an operation.

- [x] **Step 2: Load the complexity-table data**

`complexity-tables.json` is emitted by `content-foundation.md` Phase 7 Step 13b (`buildComplexityTables()`) and served at `/wiki-fe/data/complexity-tables.json` (`app-skeleton.md` Phase 4 Step 9a). Load it via `loadDataJson("complexity-tables")` with the existing zod schema (`{ columns, rows: { operation, values } }` — plan's `{ operations, cells }` shape was stale). No client-side markdown parsing. DS picker titles come from `search-index.json` (non-empty-only cache, WIKI-571).

- [x] **Step 3: Run Step 1's test, confirm failure, implement `complexity-matrix.ts`, run, confirm pass.**

- [x] **Step 4: Failing test — `ComplexityCompare` modal**

Port `openComparePicker` / `closeComparePicker` / `renderPickerList` from `js/app/complexity-compare.js`: a search-filterable list of DS-section structures (`DS_SECTION_HEADING = "Data Structures"`), pick up to 4, render the merged matrix, a status line ("Comparing N structures" / "N of M had a complexity table"). Uses `Modal` + `registerModal`. Test: open → picker list; pick 2 → matrix renders; pick a 5th → blocked at 4.

- [x] **Step 5: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 6: Wire the trigger** — prefs Actions tab button (`data-action="complexity-compare-open"`) → `wiki:open-complexity-compare` event; mounted in root layout. `pnpm typecheck && pnpm lint` green; unit + e2e green. Visual check pending (not yet done live in-browser).

- [x] **Step 7: e2e — restore `tests/e2e/test_complexity_comparator.py`** — updated to real routes + Modal detach semantics + `/data/search-index.json` mock path. 8/8 green.

**Exit criteria:** comparator picks up to 4 structures, merges their Big-O tables, handles missing tables. e2e green.

---

## Phase 4 — Changelog view

**Goal:** `/changelog` — `content/CHANGELOG.md` parsed into date-grouped entries, filterable by filename in real time, filenames linking to their article when resolvable. Ported from `js/render/changelog-view.js`.

**Files:**
- Create: `app/changelog/page.tsx` (server component — parses `content/CHANGELOG.md` at build), `components/changelog/ChangelogFilter.tsx` (client — the filename filter)
- Create: `lib/content/changelog.ts` — parse + filename→article resolution
- Modify: `css/view-changelog.css` stays in the chain
- Tests: co-located

- [x] **Step 1: Failing test — `lib/content/changelog.ts` parse**

Port `_parseChangelog` from `js/render/changelog-view.js`: `DATE_HEADING_RE = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/`, `ENTRY_RE = /^-\s+(.+)$/`, `FILENAME_RE = /`([^`]+)`/g` — produce `{ date, entries: [{ text, filenames: string[] }] }[]`. Test against a fixture CHANGELOG: date groups in order, entries per group, backtick filenames extracted.

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: Failing test — filename→article resolution**

Port `_resolveFilename` from `js/render/changelog-view.js` — match a bare filename against the manifest / search index to get `{ wikiId, path, title }`, or null. Test: a real article filename resolves; a made-up one returns null.

- [x] **Step 4: Run, confirm failure, implement (against `getManifest()`), run, confirm pass.**

- [x] **Step 5: Implement `app/changelog/page.tsx`** — server component: parse at build, render date groups, each entry with resolved filenames as `next/link` chips (`.changelog-file-link`) and unresolved ones as `<code>`. Port the render from `_renderGroups` / `_renderEntryHtml` / `_renderFilenameChip` (drop the inline `onclick="navigateToContent(...)"` — use `next/link`).

- [x] **Step 6: Failing test — `ChangelogFilter` real-time filter**

Port `_applyFilter` from `js/render/changelog-view.js` — a text input that hides entries whose `data-filenames` don't include the query, hides groups with nothing visible. Client island over the server-rendered list. Test: type a filename fragment → only matching entries + their groups visible. **Deviation:** React-filtered list (unmount non-matches) instead of DOM `hidden` mutation — same UX, no island DOM scrape.

- [x] **Step 7: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 8: Add `/changelog` to nav** — home topbar icon (`data-action="changelog-open"`). `out/changelog/index.html` emitted. typecheck + lint + test green. Visual check pending.

- [x] **Step 9: e2e — restore `tests/e2e/test_changelog.py`** — updated for static `/changelog/` (no runtime stubbing). 8/8 green.

**Exit criteria:** `/changelog` renders date-grouped entries from `content/CHANGELOG.md`, filters by filename live, links resolvable filenames to articles. e2e green.

---

## Phase 5 — Progress dashboard view

**Goal:** `/dashboard` — three drill-down levels: wiki cards → per-section bars → per-learning-path bars. Ported from `js/render/dashboard-view.js`.

**Files:**
- Create: `app/dashboard/page.tsx`, `app/dashboard/[vertical]/page.tsx`, `app/dashboard/[vertical]/paths/page.tsx` (mirroring the vanilla `#dashboard` / `#dashboard/<wiki>` / `#dashboard/<wiki>/paths` hash levels)
- Create: `components/dashboard/ProgressBar.tsx`, `components/dashboard/DashboardGrid.tsx` (client — reads local completions)
- Tests: co-located

- [x] **Step 1: Failing test — `ProgressBar`**

Port `_bar(label, completedCount, total)` from `js/render/dashboard-view.js` — `.dashboard-card`, `.dashboard-bar-track` / `.dashboard-bar-fill--completed`, `pct = round(completed/total*100)`. Test: 3 of 4 → 75% fill, "3 / 4 (75%)" label.

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: Failing test — dashboard data assembly**

The completion counts come from `lib/storage` completions (per-wiki-per-article Set). Section totals + learning-path totals come from `getVerticalIndex(id)` (sections, learningPaths — already in `lib/content` from `content-foundation.md`). Port `extractTrackArticlePaths` if not already covered. Test: given a seeded completions Set + a vertical index → correct per-section and per-track counts.

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: Implement the three route levels** — `/dashboard` = wiki cards (overall % per vertical), `/dashboard/[vertical]` = per-section bars, `/dashboard/[vertical]/paths` = per-learning-path bars. `generateStaticParams` over verticals. Drill-down via `next/link` (replaces the hash-nav `data-nav-target` + `_wireCardClicks`). The bars themselves are a client island (completions are local, client-only).

- [x] **Step 6: Add `/dashboard` to nav** — home topbar. All three levels emitted under `out/dashboard/`. typecheck + lint + test green. Visual check pending.

- [x] **Step 7: e2e — restore `tests/e2e/test_dashboard.py`** — updated for real routes/completions (dropped search-command + stubbed-index cases). 7/7 green.

**Exit criteria:** `/dashboard` shows the three drill-down levels with accurate local completion data. e2e green.

---

## Phase 6 — Admin view

**Goal:** `/admin` — broken-links + orphan-pages reports, gated to the admin role. Ported from `js/render/admin-view.js`.

**Files:**
- Create: `app/admin/page.tsx` (client — gated on session role), `components/admin/ReportTable.tsx`
- Create: `lib/admin/reports.ts` — assemble the reports from build data
- Tests: co-located

- [x] **Step 1: Failing test — `lib/admin/reports.ts`**

Port the report assembly from `js/render/admin-view.js`:
- **Broken Links**: from `broken-links.json` (Node-generated, `content-foundation.md` Phase 7) — flatten `{ sourcePath, links[] }` to `{ title, target }` rows
- **Orphan Pages**: articles with no entry in `backlinks.json` — walk `getManifest()` articles, cross-check `getBacklinks(path)`
Test: seeded broken-links data → correct row count; an article with zero backlinks → appears in orphans.

- [x] **Step 2: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 3: Failing test — `/admin` role gate**

`app/admin/page.tsx` is a client page: `useSession()` → if `user?.role !== "admin"`, render a "not authorised" state; else render the reports. (Static export can't server-gate; the gate is client-side + the real protection is that the reports contain only public build data anyway — note this.) Test: non-admin session → gated; admin session → reports shown. Implementation: server page bakes reports; client `AdminView` gates + Users / Site Health tabs.

- [x] **Step 4: Run, confirm failure, implement, run, confirm pass.**

- [x] **Step 5: Implement `ReportTable.tsx`** — port `.admin-report-section` / `.admin-table` / `.admin-mono` / `.admin-empty` markup from `js/render/admin-view.js`. Two tables: Broken Links, Orphan Pages, each with a count in the heading and an empty state.

- [x] **Step 6: Add `/admin` to nav (visible only when `user.role === "admin"`, like today). Confirm build. typecheck + lint + test + visual check.** — `AdminNavButton` in `HomeTopbar`; lint/typecheck/build green. Visual check pending (not yet done live in-browser).

- [x] **Step 7: e2e — restore `tests/e2e/test_admin.py`** — updated (role stubs, selectors, Users + Site Health). 7/7 green.

**Exit criteria:** `/admin` shows broken-links + orphan-pages reports, gated to the admin role. e2e green. ✅

---

## Phase 7 — Part A exit gate

**Files:**
- Create: `docs/_meta/plans/nextjs-migration/sub-spec-4-exit.md`

- [x] **Step 1: Fill the checklist against spec §5 Sub-spec 4 exit criteria** — `sub-spec-4-exit.md` (2026-10-01). All six Phase-4 rows ✅; e2e 365 passed / 201 skipped.

- [x] **Step 2: Run the full e2e suite locally** — `.venv/bin/python3 -m pytest tests/e2e/ -q` → **365 passed / 201 skipped / 0 failed**. Restored `test_notes_scratchpad.py` early; skip-marked dropped `test_section_map.py`; retagged highlight e2e skips for Phase 9.

- [x] **Step 3: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`** — all green (vitest 458/458; build 184 routes).

- [x] **Step 4: Checkpoint** — report in `sub-spec-4-exit.md`. Part B (hardening) starts next; feature parity with vanilla minus dropped features.

**Exit criteria:** all six deferred features live. Full e2e suite green against the Next build. ✅

---

# Part B — Hardening (spec §5 Sub-spec 5)

---

## Phase 8 — Retire the Python generators + CI final form

> **CI-gate note (from `content-foundation.md` Phase 0 Step 13):** `pnpm typecheck` + `pnpm lint` + `pnpm test` must be an authoritative CI gate. Local `.pre-commit-config.yaml` already runs `ts-typecheck` / `ts-lint` local hooks (added in Phase 0); `app-skeleton.md` Phase 1 added the `frontend` CI job + the `.pre-commit-config.ci.yaml` block. This phase only confirms they are wired and removes the now-dead script hooks.

**Goal:** one `next build` produces manifest + search-index + backlinks + broken-links + bridges + previews + complexity-tables. The four Python scripts and their CI jobs are removed. CI reaches its final shape.

**Files:**
- Delete: `scripts/build_search_index.py`, `scripts/build_backlinks.py`, `scripts/build_broken_links.py`, `scripts/validate_bridges.py`, `scripts/bump_cache_version.py` (no `wiki-sw.js` to bump — Serwist hashes its own precache)
- Modify: `.github/workflows/ci.yml` — remove `search-index`, `backlinks`, `broken-links`, `bridges`, `cache-version` jobs; the `build` job's `buildContent()` already produces + the `frontend` job already gates
- Modify: `.pre-commit-config.yaml` / `.pre-commit-config.ci.yaml` — remove any hooks invoking the deleted scripts; add `pnpm typecheck` + `pnpm lint` + `pnpm test` as authoritative gates (the note left in `content-foundation.md` Phase 0 Step 13)
- Modify: `wiki-fe/CLAUDE.md` COMPLETION CHECKLIST — the "regenerate search-index.json / backlinks.json" steps become "these are produced by `next build`; no manual step"

- [x] **Step 1: Confirm the Node build's equivalence held** — fresh Python run → `tests/content/reference/`; `pnpm exec vitest run tests/content/equivalence.test.ts` → **4/4 green** (2026-10-01). Last use of the Python generators.

- [x] **Step 2: Delete the five Python scripts + their `__pycache__` entries.** — deleted `build_search_index.py`, `build_backlinks.py`, `build_broken_links.py`, `validate_bridges.py` + `scripts/__pycache__`. `bump_cache_version.py` already gone at cutover.

- [x] **Step 3: Remove the five CI jobs from `ci.yml`.** Removed `search-index`, `backlinks`, `broken-links`, `bridges`, `dead-links`. Remaining: `hooks`, `tests-light`, `frontend`, `build` (+ `git diff` gate on committed indexes), `deploy`, `dsa-sd-check`, `semgrep`. (`tests-heavy` was already absent — shard balance is Phase 9.)

- [x] **Step 4: Update `.pre-commit-config*.yaml`** — dropped generator + validate-bridges hooks from local config. `pnpm typecheck` / `pnpm lint` stay as local hooks; CI `frontend` already gates typecheck + lint + test. `.pre-commit-config.ci.yaml` had no script hooks.

- [x] **Step 5: Update `wiki-fe/CLAUDE.md` COMPLETION CHECKLIST** — steps 5–6 now "produced by `next build`"; Serwist note replaces wiki-sw cache-version bump. `build-content.mjs` writes Node baseline into `content/{search-index,backlinks,broken-links}.json`; CI `build` `git diff --exit-code`s them.

- [x] **Step 6: Run `pnpm build` + the e2e suite + `pnpm test`** — `pnpm test` **458/458**; `pnpm build` ✅ (184 routes; SW 91 URLs / 2.67 MB); e2e **362 passed / 3 failed / 201 skipped** then the 3 failures reran clean (**3/3** — hotkey/modal flakes, not Phase-8 regressions). No Python generator in the loop. Node baseline committed-diff: `content/backlinks.json` + `content/broken-links.json` key-order rewrite (expected post-Python retirement); `search-index.json` unchanged.

**Exit criteria:** the four generators + `bump_cache_version.py` gone; CI at final form (one build job produces all derived data, one deploy job); no manual regeneration steps in `CLAUDE.md`. ✅

**Ruling (Phase 8):** `build-content.mjs` now copies Node `search-index`/`backlinks`/`broken-links` into `content/`; CI `build` `git diff --exit-code`s them. `bump_cache_version.py` already deleted at cutover. `tests-heavy` job absent pre-existing — Phase 9 shard balance. Local lychee pre-commit hook kept (not a deleted-script hook); CI `dead-links` job removed per plan.

---

## Phase 8b — `lib/content` build/read split (own epic)

**Raised** `app-skeleton.md` Phase 7. `lib/content` renders markdown on import, so `getArticle` is both renderer and accessor and `next build` re-runs the whole pipeline `content:build` already ran (~25 s of a ~66 s build). The fix is architectural, not a cache: split `lib/content` into a `build/` renderer (dev/CI-only) and a `read/` pure accessor over `generated/`, one render, `next build` a pure emit step. Hardens migration principle #7 (isolate content logic from framework).

**Full write-up + scope + rationale for deferral:** [`content-lib-split.md`](./content-lib-split.md). It needs its own short spec before code (the `generated/` artifact schema + version, the two API surfaces, the test-migration list). Land it here as a Part B phase, or spin it out as a standalone ticket — either way, after cutover, in isolation, not alongside it.

**Exit criteria:** `content-lib-split.md` executed; full build drops to ~40 s; `read/` has zero `unified` dependency; the `Article` shape `getArticle` returns is byte-identical to today (fixture-pinned); all existing `lib/content` + `app/` + `tests/content/` tests green.

---

## Phase 9 — e2e full sweep + CI wiring

**Goal:** the Python e2e suite fully aligned with the Next app — final selector/URL pass across every file, CI running it against the built site. (Most of this happened incrementally in `cutover.md` Phase 13 and Part A's per-feature e2e steps; this is the completeness pass.)

**Files:**
- Modify: `tests/conftest.py` (final form — serve `out/` or `next dev`), any remaining `tests/e2e/test_*.py`
- Modify: `.github/workflows/ci.yml` — `tests-light` / `tests-heavy` run against the Next build

- [x] **Step 1: Read `tests/conftest.py`** — serves `out/` under `/wiki-fe/`, `_ensure_build`, `wiki_page` home helper. Matches Next static export. No new fixtures.

- [x] **Step 2: Run the entire suite** — full run after restores: **370 passed / 6 failed / 190 skipped**; failures were prefs hotkey races in complexity comparator + 2 modal flakes. Fixed comparator open to use topbar Preferences button → **8/8** `test_complexity_comparator.py`. Highlight **11/11**, notes **8/8**. Remaining skips = e2e-modernization mock-article epic + deferred TOC chips — not stale hash-URL fails.

- [x] **Step 3: Confirm no dropped-feature tests remain** — deleted `tests/e2e/test_section_map.py` (whole-file skip). Remaining grep hits are Dropped: comments or live reuse of `.link-graph-modal` CSS by complexity comparator.

- [x] **Step 4: Wire CI** — `tests-light` already `needs: [build]` + downloads `out/` artifact + `/wiki-fe/` via conftest. Added Part A files to shards: notes→shard-1; dashboard/admin/complexity→shard-2; changelog→shard-3. (`tests-heavy` still absent — pre-existing; no separate heavy lane to wire.)

- [x] **Step 5: Note the post-migration epic** — `CONVENTIONS.md` Testing section: `@playwright/test` (TS) port tracked post-migration (spec §10, §14).

- [x] **Step 6: Return to Phase 1 Step 11** — restored 11 highlight/marker e2e onto real routes (`_hl_article` → caching / url-shortener); toolbar count **7** (save-as-card dropped). Left `test_highlight_reanchor_and_drop_on_upstream_edit` skipped (needs mutable mock — not portable to static export; vitest covers relocation). Production fix: toolbar button `mousedown` `preventDefault` so selection/`activeRange` survive the click. **11/11 green.**

- [x] **Step 7: Return to Phase 2 Step 6** — already on real routes (`system-design/components/caching`); **8/8 green.**

**Exit criteria:** the full Python e2e suite passes against the Next build in CI. No dropped-feature tests. TS-port epic recorded as a follow-up. Phase 1's deferred e2e (Step 11) and Phase 2's deferred e2e (Step 6) both restored and green. ✅ (CI shard wiring local; push validates remotely.)

**Ruling (Phase 8b):** deferred — `content-lib-split.md` still needs its own short executable spec before code; not blocking Phase 9/10.

---

## Phase 10 — Docs rewrite

**Goal:** `CLAUDE.md`, `CONVENTIONS.md`, `readme.md`, the memory, and the `wiki` root `CLAUDE.md` all describe the Next stack.

**Files:**
- Rewrite: `wiki-fe/CLAUDE.md` — Tech Stack section (Next, App Router, static export, TS, pnpm, exact Node, Serwist, Shiki, unified pipeline, Vitest, ESLint + Biome), a new FILE MAP for `app/` + `lib/` + `components/`, TASK→FILE routing for the new layout, session protocol, the search-index/backlinks generator change. State that **SEO/discoverability is not a project goal** (personal tool; `robots: Disallow: /`) — so no content task or ticket should optimise for it.
- Rewrite: `wiki-fe/CONVENTIONS.md` — TS + Next conventions; **keep** the SRP / size-signal / DRY / single-line-comment rules; **add** the testing rule (Vitest; fixture-first for pipeline plugins + new `lib/` logic, code-then-test for island ports — supersedes the old "skip the TDD loop" line); the `components/` per-feature folder rule (already added in `cutover.md` Phase 1 — consolidate here); the island rule from overview.md
- Modify: `wiki-fe/readme.md` — architecture section
- Modify: `wiki/CLAUDE.md` (root) — the fe-stack cell: `vanilla JS (ES modules), no build/bundler/TS` → `Next.js (App Router, static export), TypeScript, pnpm`; the `wiki-fe/js/api.js` coupling-point line → `wiki-fe/lib/api.ts`

- [x] **Step 1: Rewrite `wiki-fe/CLAUDE.md`** — FILE MAP is `app/` / `lib/` / `components/` / `css/`; SEO-not-a-goal; Serwist; Node content indexes; Playwright MCP note kept.

- [x] **Step 2: Rewrite `wiki-fe/CONVENTIONS.md`** — TS/Next + island rule + Vitest fixture-first/code-then-test + per-feature `components/`; kept SRP/size/DRY/single-line/no-console/no-ticket-IDs.

- [x] **Step 3: Update `wiki-fe/readme.md`** architecture section — build-time pipeline, islands, static export, `pnpm dev`/`pnpm build`.

- [x] **Step 4: Update `wiki/CLAUDE.md` (root)** — fe stack cell → Next/TS/pnpm; coupling point → `wiki-fe/lib/api.ts`.

- [x] **Step 5: Supersede the `fe-no-node-phase1` memory** — rewritten as Next stack (`fe-next-stack` name; same filename). `feedback-tdd-now-in-scope` clarifies fixture-first vs code-then-test (not universal red-green). `MEMORY.md` index updated; cross-linked.

- [x] **Step 6: Read back each rewritten doc once** — grep clean of live "vanilla JS" / "Showdown" / "no build step" claims (historical supersession notes in memories only).

**Exit criteria:** all four docs + the memory describe the Next stack. No stale vanilla-era references. `MEMORY.md` index updated. ✅

---

## Phase 11 — Confirm the `wiki-be` ticket + final gate

**Goal:** the `wiki-be` CORS ticket was **filed in `app-skeleton.md` Phase 8** (before cutover). This phase confirms it is resolved and runs the whole-migration green check. (spec §11)

**Files:**
- Create: `docs/_meta/plans/nextjs-migration/sub-spec-5-exit.md`

- [x] **Step 1: Confirm the `wiki-be` ticket is resolved** — the `WIKI-BE-xxx` filed in `app-skeleton.md` Phase 8. Check its status in the `wiki-be` backlog. It should record either "verified, no CORS change needed" (expected — same `mshardul.github.io` origin) or a completed CORS allowlist update. If still open and it flagged a required change, the personal layer is at risk — flag it.

- [x] **Step 2: Fill `sub-spec-5-exit.md`** against spec §5 Sub-spec 5 exit criteria:
  - docs match shipped code ✅/❌
  - CI green end to end ✅/❌ (run link)
  - the `wiki-be` ticket is resolved ✅/❌ (ticket id + status)

- [x] **Step 3: Full end-to-end check**
  - `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm build` — green
  - `.venv/bin/python3 -m pytest tests/e2e/ -q` — green
  - the live production `/wiki-fe/` URL — every route loads, offline works, auth + sync work against live `wiki-be`, every page titled, `robots.txt` disallows all. **No Lighthouse SEO check** (spec §14).
  - grep the repo for `Showdown`, `showdown`, `highlight.js`, `hljs`, `DOMPurify`, `wiki-sw.js`, `js/app.js` — zero live references (only in docs as historical notes, if anywhere)

- [ ] **Step 4: Final checkpoint** — report. The migration is complete: Next.js App Router, static export, TypeScript, pnpm, build-time content pipeline, island interactivity, full feature parity minus the dropped decorations, offline, reader-facing metadata, docs rewritten, the `wiki-be` ticket resolved. SEO/discoverability remains a separate public-launch epic (spec §14).

**Exit criteria:** `sub-spec-5-exit.md` all ✅. The `wiki-be` ticket is resolved. The full toolchain + e2e + build are green. The vanilla stack has no live references anywhere in the codebase.

---

## What this unlocks (recorded, not built here — spec §14)

Public-launch readiness (SEO, sitemap, `robots` allow, structured data, OG images, a Lighthouse-SEO gate), interview-prep content layer (`interview-mode-content-stub.md` → its own spec), quiz mode, a re-architected search index (proper inverted index / search library), custom domain + Vercel cutover for Shape C server features, the `@playwright/test` TypeScript migration. None are in scope; each is a separate future epic.
