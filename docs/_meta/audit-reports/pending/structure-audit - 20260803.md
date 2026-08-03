# Structure Audit (wiki-fe)

Periodic file/directory structure review - non-content files only (`content/` excluded). Not a bug hunt or UX audit. Findings discussed and decided with the user in-session; each item below records the decision, not just the observation. Zero implementation done as part of this audit - decisions only, for later execution.

## Findings by concern

### Naming inconsistency

#### [DECIDED] `docs/_meta/audit prompts/` has a space in its dirname

- **Files:** `docs/_meta/audit prompts/` (7 files) vs sibling `docs/_meta/audit-reports/` (hyphenated)
- **Observation:** every other `docs/_meta/` subdirectory uses hyphens (`audit-reports`, `ai-instructions`); this is the only space-separated dirname in the repo. Referenced from `readme.md`, `docs/tickets-archive.md`, one file inside itself, and root-level `.prompts/fe-run-audit.md`, `.prompts/fe-audit-reports-to-content-backlog.md`, `.prompts/fe-audit-reports-to-tickets.md`.
- **Decision:** rename to `docs/_meta/audit-prompts/`; update all referencing files.

#### [DECIDED] `docs/_meta/AI-instructions-interview-scenarios.md` misplaced, outside its own category's directory

- **Files:** `docs/_meta/AI-instructions-interview-scenarios.md` (112 lines) vs sibling `docs/_meta/ai-instructions/` (`_base.md`, `algorithms.md`, `components.md`, `hld.md`, etc.)
- **Observation:** file's own header states "Read `ai-instructions/_base.md` first" and describes itself as a companion sub-page spec referenced from `components.md`, `algorithms.md`, and `hld.md` - all three of which live inside `ai-instructions/`. Confirmed via full-repo grep: referenced from those three plus `docs/tickets-archive.md` and three `content/system-design/components/*.md` files. Casing also mismatched (`AI-instructions-` vs directory's lowercase `ai-instructions`).
- **Decision:** move into `ai-instructions/`, drop the now-redundant prefix - becomes `ai-instructions/interview-scenarios.md`. Update all referencing files (docs and content).

#### [DECIDED] `css/components-auth.css` breaks the `components/*.css` naming/placement pattern

- **Files:** `css/components-auth.css` (top-level file) vs `css/components/` (dir containing `bookmarks-modal.css`, `link-graph.css`, `preferences-modal.css`, `search-modal.css`, `toast.css`, `topbar.css`, `wiki-switcher.css` - all unprefixed, all inside the folder)
- **Observation:** every other component stylesheet lives inside `css/components/` without a `components-` prefix (the folder name already implies it); this is the one file sitting at `css/` top level with the prefix instead. Confirmed live-reference count before deciding: only 1 actual code reference (`css/wiki.css`'s `@import "./components-auth.css"`) plus 2 prescriptive docs (`CLAUDE.md`, `CONVENTIONS.md`) need updating on a move - roughly 20 other hits across the repo are frozen path-strings inside dated audit reports and `docs/tickets-archive.md`, unaffected by a rename.
- **Decision:** move to `css/components/auth.css`; update the `@import` in `wiki.css` and the two doc references.

### File size / single-responsibility

#### [DECIDED] Six JS files exceed the ~400-line split threshold (CONVENTIONS.md) with no documented exception

- **Files:** `js/storage/settings-theme.js` (915), `js/search.js` (844), `js/content/formatting.js` (759), `js/app.js` (741), `js/auth.js` (674), `js/render/home-index.js` (655). (`js/render/content-view.js` at 862 already carries the documented one-line exception comment CONVENTIONS.md requires for a file that stays big on purpose - used as the reference pattern below.)
- **Observation / per-file decision:**
  - `settings-theme.js` - the 480-line `Settings` object (lines 365-843) is a modal controller (open/close/tab-switch/focus-trap) + 8 near-identical swatch `_render*` methods + 9 individual `_set*` actions + data-clear flow + export/import backup, all in one object literal. **Decision: split `Settings` out into `js/app/settings-modal.js`**, matching the existing `js/app/bookmarks-modal.js` / `wiki-switcher.js` pattern. `settings-theme.js` keeps state/settings-CRUD/`Sync`.
  - `auth.js` - already two clean top-level objects, `AuthModal` (120-331) and `Auth` (332-673). **Decision: split into two files** (e.g. `js/auth/modal.js` + `js/auth/flows.js`, exact naming TBD at implementation time).
  - `formatting.js` - worst case: 8 distinct concerns (callouts, prereqs, anchor links, LaTeX formula toggle/copy, focus mode, `ArticleFind` in-article-find, tabbed code blocks, footnotes+end-marker) but only 4 section banners. `ArticleFind` alone is a self-contained 157-line object (391-548). **Decision: split at minimum `ArticleFind` and the focus/study-mode toggle pair into their own files**; re-evaluate remaining boundaries at implementation time.
  - `search.js` - mostly one cohesive modal lifecycle; the command-palette sub-mode (lines 115-356, `_contextWikiId` through `_resolveQuizArg`, ~240 lines) is the one clearly separable chunk. **Decision: extract to `js/app/search-commands.js`** (or similar name, TBD). See also the separate `js/search/` folder-grouping decision below - the command-palette extraction happens first, folder grouping happens once the resulting file shapes are settled.
  - `home-index.js` - pinned-wikis helpers (lines 35-76: `getPinnedWikis`, `setPinnedWikis`, `togglePinnedWiki`, `_sortWikisByPin`) are a distinct concern from render/controls/keynav/hover-preview. **Decision: extract pinned-wikis helpers to their own file.**
  - `app.js` - bootstrap/entry point by definition, likely the same legitimate "single cohesive pipeline" exception class as `content-view.js`. **Decision: add the documented one-line exception comment rather than split**, pending a closer look confirming it's genuinely non-decomposable.
  - `js/content/highlights.js` (430 lines) - missed in the initial size-screening pass (an `awk '$1>350'` cutoff caught it, but it wasn't carried through to a decision at the time). **Decision: skip.** 430 lines is close enough to the ~400 threshold to not be worth splitting right now.
- **Fix direction:** implement each per-file split above; update CLAUDE.md's FILE MAP subtables and CONVENTIONS.md's module-map to reflect new files (see bundled doc-drift finding below - this will add to that list, not fix it).

### Directory topology

#### [DECIDED] `js/search.js` + `js/search-features.js` group into a `js/search/` folder

- **Files:** `js/search.js` (844 lines), `js/search-features.js` (114 lines) - both currently loose at `js/` top level, alongside singles like `app.js`, `auth.js`, `api.js`, `state.js`
- **Observation:** every other multi-file feature area in the codebase is already a folder - `js/app/` (11 files), `js/content/` (13 files), `js/render/` (12 files), `js/storage/` (10 files). Search is the one exception: two files, genuinely coupled (confirmed via import - `search.js` imports `expandQuery`, `extractSnippet`, `getFallbackSuggestions`, `renderRecentSearches` directly from `search-features.js`), sitting loose instead of grouped.
- **Decision:** group into `js/search/` (e.g. `js/search/modal.js` + `js/search/features.js`, exact naming TBD). Sequenced after the command-palette extraction from `search.js` (see the file-size finding above) so the folder's contents reflect the settled post-split file shapes, not a mid-refactor state.

#### [DECIDED] `docs/_meta/plans/dsa-worked-problems-dedup*` cluster (5 files) stays flat - no folder

- **Files:** `docs/_meta/plans/dsa-worked-problems-dedup.md` (main plan, 34k), `dsa-worked-problems-dedup-steps.md` (884b, explicitly "Companion to `dsa-worked-problems-dedup.md`"), `dsa-worked-problems-dedup-inventory.md` (18k, Patterns), `dsa-worked-problems-dedup-algo-inventory.md` (18k, Algorithms), `dsa-worked-problems-dedup-ds-inventory.md` (14k, Data Structures) - all cross-referencing each other by exact filename, all sharing one 24-character prefix, sitting flat in `plans/` alongside 3 unrelated files
- **Observation:** structurally this is the same "related files, no folder" pattern as the `js/search.js` finding above, just 5 files deep with a repeated prefix instead of 2. Initially proposed nesting into `docs/_meta/plans/dsa-worked-problems-dedup/` with shortened names inside. Discussed with the user: unlike the `js/search/` case, this cluster is a **transient, in-progress, eventually-completable initiative** (has a status checklist, prerequisite tickets, "applied"/"not applied" per-file tracking), not a permanent structural category - once the dedup work finishes, these files get deleted outright, not maintained as a folder.
- **Decision:** leave flat as-is. Not worth restructuring files that are a temporary blip and headed for deletion once the dedup work completes.

#### [DECIDED] `docs/_meta/decisions/` dissolves entirely - all files flatten into `docs/_meta/`

- **Files:** `docs/_meta/decisions/auth.md`, `auth-integration.md`, `fe-be-split.md`, `infra-deploy.md`, `preferences-modal.md`, `ui-ux.md`, plus `docs/_meta/decisions/process/ci.md`, `story-points-estimation.md`, `tickets.md` (9 files total)
- **Observation:** content-checked every file before deciding. Some (`auth.md`, `infra-deploy.md`, `fe-be-split.md`, `auth-integration.md`, `process/ci.md`, `process/tickets.md`) are genuinely decision-framed - explicit "why," status tracking ("design locked, not yet executed" / "executed"), cross-links between them. Others (`preferences-modal.md`, `ui-ux.md`, `process/story-points-estimation.md`) are plain spec/reference content with no decision-narrative framing at all. Initial proposal was a narrower fix (move only the non-decision-framed files out, keep `decisions/` holding true decisions) - discussed with the user, who preferred full dissolution: maintaining a per-file category boundary (decision vs. reference) isn't worth it long-term, since in practice most `_meta/` docs originated as "a decision that was made at some point," and a flat `_meta/` is simpler to navigate and avoids new docs landing in the wrong bucket going forward.
- **Decision:** dissolve `docs/_meta/decisions/` (including its `process/` subdirectory) entirely. All 9 files move up to flat `docs/_meta/`. Update the 5 files with confirmed live references to the old `decisions/` paths: `CONVENTIONS.md`, `CLAUDE.md`, `docs/_meta/audit prompts/auth-ux-audit-agent-prompt.md`, `docs/_meta/audit prompts/codebase-quality-audit-agent-prompt.md`, `docs/_meta/plans/fe-be-integration.md`.

### CSS structure

#### [DECIDED] `css/view-content/layout.css`'s "TOC Sidebar" section conflates two unrelated widgets

- **Files:** `css/view-content/layout.css` (711 lines total, over the ~400-line component threshold), specifically the "TOC Sidebar" banner section (lines 96-434, 339 lines - the largest of the file's 4 bannered sections: Sticky Section Header 30 lines, Article Hero 65 lines, TOC Sidebar 339 lines, Markdown Body 276 lines)
- **Observation:** the `.notes-scratchpad*` rules (lines 149-234, ~85 lines) are a self-contained widget (backed by `js/storage/notes.js`) with no structural relationship to TOC nav/items/mobile-drawer rules they're currently interleaved with.
- **Decision:** split `.notes-scratchpad*` rules out into their own CSS file. Reduces `layout.css` from 711 to ~625 lines; rest of the TOC Sidebar section (nav/items/mobile drawer) stays as one cohesive unit.

### Dead / orphaned files

#### [DECIDED] `docs/scripts/` is an empty, tracked directory

- **Files:** `docs/scripts/`
- **Decision:** delete.

#### [DECIDED] `docs/changelog.md` is a 0-byte tracked file, confusable with the real changelog

- **Files:** `docs/changelog.md` (0 bytes), vs `content/CHANGELOG.md` (the real, actively-used content changelog per CLAUDE.md's completion checklist)
- **Observation:** only referenced by CLAUDE.md itself (in the Docs file-map table); nothing else in the repo points to it.
- **Decision:** remove the file and its CLAUDE.md reference.

#### [DECIDED] `docs/_meta/ai-instructions/scripts/` holds two orphaned utility scripts in the wrong location

- **Files:** `docs/_meta/ai-instructions/scripts/dsa-check.sh`, `docs/_meta/ai-instructions/scripts/dsa_check.py`
- **Observation:** the repo already has a canonical `scripts/` directory at root for build/CI/utility scripts (`build_backlinks.py`, `build_broken_links.py`, `build_practice_problems_index.py`, `build_search_index.py`, `bump_cache_version.py`, `validate_bridges.py`). These two DSA-check scripts are the same category of thing, just nested inside a docs subfolder instead.
- **Decision:** move both files to root `scripts/`.

#### [DECIDED] Two audit-prompt files still reference the sidecar-TOC feature, removed today by WIKI-489

- **Files:** `docs/_meta/audit prompts/security-audit-agent-prompt.md` (Concern 3 in full, ~15 lines - BroadcastChannel/postMessage origin checks scoped entirely to `js/app/sidecar-toc.js`, `js/toc-companion.js`, `toc-companion.html`), `docs/_meta/audit prompts/codebase-quality-audit-agent-prompt.md` (2 lines, Concern 11's HTML↔JS↔CSS contract scope mentions `toc-companion.html`)
- **Observation:** confirmed via `docs/tickets-archive.md` - WIKI-284 (2026-06-19) built the sidecar-TOC feature as `toc-companion.html` + `js/toc-companion.js` + `js/app/sidecar-toc.js`; WIKI-489 (2026-08-03, same day as this audit) removed it entirely ("Removed cleanly - no other references remained"). But these two audit-prompt files are live, reusable instructions for *future* audit runs, and still tell an agent to go audit a feature and files that no longer exist. (The historical `codebase-quality-audit - 20260725.md` report also mentions these files, but that's a frozen dated record, not live guidance - no action needed there.)
- **Decision:** remove `security-audit-agent-prompt.md`'s Concern 3 entirely (no BroadcastChannel/postMessage feature exists to audit anymore - if a future feature reintroduces cross-window messaging, re-add a concern then), and fix the `toc-companion.html` mentions in `codebase-quality-audit-agent-prompt.md`.

#### [DECIDED] `docs/_meta/mobile-ux-audit.md` is a real, non-duplicate orphaned audit report

- **Files:** `docs/_meta/mobile-ux-audit.md` (222 lines, undated), vs `docs/_meta/audit-reports/mobile-ux-audit - 20260710.md` (453 lines) and `- 20260725.md` (227 lines)
- **Observation:** initial hypothesis was that this loose file might be a draft or subset of one of the two dated reports. Verified by diffing every `#### [SEVERITY] Title` finding heading across all three files: **zero title overlap** between the loose file and either dated report - entirely distinct findings (loose file covers text-zoom/heading-wrap, TOC safe-area padding, the 393px breakpoint gap, TOC-FAB-toggle bug, 404-landscape-unreachable, and a CRITICAL scroll-lock gap; neither dated report shares any of these). `git log --follow` on the file shows it first added 2026-07-09/10, last touched 2026-07-25 - a genuinely separate, never-filed audit pass, not a draft of either sibling.
- **Decision:** delete the file entirely rather than move/merge it. A fresh mobile-UX audit will be run later, which supersedes reconciling this older, disconnected pass now.

### Documentation drift (CLAUDE.md as source of truth, out of sync with actual repo state)

#### [DECIDED] CLAUDE.md's Docs table, FILE MAP, and Tests table have accumulated multiple stale/missing entries

This is one bundled issue - all sub-items below share the same root cause (CLAUDE.md not updated when files were added, removed, renamed, or split) and should be fixed together in one pass over CLAUDE.md.

- **`docs/tasks.md` referenced but does not exist** - CLAUDE.md's Docs table (row: "Context on recently completed work or implementation notes") points at a file that no longer exists. **Clarified by user:** this file was renamed to `tickets.md`, then later split into `docs/tickets-backlog.md` and `docs/tickets-archive.md` (both of which are already correctly documented elsewhere in CLAUDE.md). **Decision: remove the stale `docs/tasks.md` row from CLAUDE.md's Docs table** - the content it pointed to now lives in `tickets-archive.md`, already covered.
- **`js/toc-companion.js` + `toc-companion.html` documented but do not exist** - CLAUDE.md's JS file-map table (line 107) describes a "sidecar TOC popup window" module that isn't present anywhere in the repo (confirmed via full-tree search). Feature was either removed or never shipped. **Decision: update CLAUDE.md to remove this entry** (or re-add if the feature is intentionally planned - confirm at implementation time; treating as removal-of-stale-doc by default).
- **Three existing JS files missing from CLAUDE.md's FILE MAP subtables** - `js/app/install-prompt.js`, `js/storage/install-prompt.js` (confirmed not duplicates - correct app/storage split, behavior vs persisted-flag), `js/render/dashboard-view.js`. **Decision: add all three to their respective subtables.**
- **`docs/_meta/ai-instructions/dsa-cheatsheets.md` missing from CLAUDE.md's routing table** - file exists, is actively referenced by `content/dsa/index.md` and two plans docs, has a sibling (`devops-cheatsheets.md`) that *is* correctly documented ("self-contained, skip \_base.md") - but `dsa-cheatsheets.md` itself has no entry. **Decision: add it to CLAUDE.md's Docs table, same pattern as `devops-cheatsheets.md`.**
- **Ten test files missing from CLAUDE.md's Tests table** - `test_a11y_hotkeys.py`, `test_admin.py`, `test_changelog.py`, `test_dashboard.py`, `test_navigation_polish.py`, `test_notes_scratchpad.py`, `test_offline_shelf.py`, `test_structure_viz.py`, `test_toc_overhaul.py`, `test_touch_gestures.py` (33 actual test files on disk vs 25 documented). **Decision: add all ten to the Tests table.**
- **Fix direction:** one pass over CLAUDE.md updating the Docs table, all four FILE MAP subtables (`js/app/`, `js/content/`, `js/render/`, `js/storage/`), and the Tests table against actual repo state. Consider (not decided, just noted as a future option) a lightweight periodic check - e.g. diffing `find js -name '*.js'` / `find tests -name 'test_*.py'` against CLAUDE.md mentions - so this doesn't silently drift again; the prior `codebase-quality-audit - 20260801.md` flagged this exact same class of drift for `js/` alone (21 of 52 files missing at the time), meaning it has recurred since. Worth CLAUDE.md itself noting this as a recurring failure mode. **This same implementation pass should also cover the `readme.md` and `ai-instructions/tickets.md` fixes in the next finding below** - same root cause, same class of fix, no reason to split into two separate passes.

#### [DECIDED] Same doc-drift class found in two more files during full-repo verification pass - `readme.md` and `ai-instructions/tickets.md`

Found during a full read-every-file pass (triggered by the user's "some files might not even have correct names" concern) - both files reference pre-split module filenames that no longer exist, the exact same root cause as the CLAUDE.md drift above, just in two files CLAUDE.md's own audit scope didn't cover.

**Root-cause discussion (not just these two files):** the underlying problem isn't "these paths happened to go stale" - it's that CLAUDE.md's FILE MAP is supposed to be the single source of truth for "which file owns what," but nothing stops other docs from hand-copying the same information in their own prose instead of pointing at it. A hand-copy has no mechanism to notice when the original updates, so it silently rots - which is exactly what happened independently in CLAUDE.md itself, `readme.md`, and `ai-instructions/tickets.md`, all drifting the same way (pre-split filenames) without any of the three fixes propagating to the others. Discussed with the user: the fix isn't just correcting the stale names in place, it's **collapsing duplicate copies into references to the one canonical source** wherever the content is genuinely a duplicate (not wherever a file merely mentions a path) - so the class of bug becomes structurally harder to reintroduce, not just fixed once more.

- **`readme.md`'s Architecture section (line 56-68)** lists `content.js` (post-processing) · `render.js` (views + index parser) · `storage.js` (localStorage) as if they were still single files - the real repo has had these as `js/content/` (13 files), `js/render/` (12 files), `js/storage/` (10 files) directories for some time. Unlike `docs/_meta/plans/fe-be-integration.md` (also full of `storage.js` references but correctly left as-is, since that's a frozen historical implementation plan, not live guidance), `readme.md` is the project's front door and is actively read. **Decision: replace the hand-listed module breakdown with a pointer to CLAUDE.md's FILE MAP** ("see `CLAUDE.md` for the current file-by-file breakdown") rather than re-describing the directory structure in readme's own words - readme can keep the one-line architectural summary (boot sequence, views, persistence model) since that's genuinely different content, just drop the file-list duplication.
- **`readme.md`'s "Periodic maintenance" table (line 115-128)** - the table whose entire purpose is preventing exactly this kind of drift - has a stale count itself: says the `ui-components-audit-agent-prompt.md` roster is "31 currently," but the actual prompt file lists components numbered up to 53 (see `ui-components-audit-agent-prompt.md`'s own numbering-is-not-a-count-guarantee note - re-verify the true count against `find js -name '*.js'` rather than trusting either number). The table also doesn't list itself, or `ai-instructions/tickets.md`'s COMPONENT → FILE MAPPING (next bullet), as things needing periodic drift-checks, despite both being exactly the kind of file-list-that-doesn't-update-itself the table exists to track. (No longer needs to list its own Architecture section per the fix above, since that section no longer hand-lists files.) **Decision: fix the stale count, and add the `tickets.md` row to the maintenance table.**
- **`docs/_meta/ai-instructions/tickets.md`'s COMPONENT → FILE MAPPING table (line 85-100)** - live, actively-referenced ticket-routing instructions ("map Component tags to files using the table above... read only the mapped files"), not a historical record. Five of eleven rows point at pre-split filenames that don't exist: `content` → `js/content.js`, `js/render.js`; `render` → `js/render.js`; `storage` → `js/storage.js`; `settings` → `js/storage.js`; `ui` → `css/components.css` (never existed under that name - real structure is `css/components/`). Following this table today would send an agent to nonexistent files for the most common ticket components. Also references `docs/_meta/decisions/tickets.md` and `docs/_meta/decisions/story-points-estimation.md` three times - paths already covered by the `decisions/` dissolution decision above, so those three references need updating as part of that move regardless. **Decision: rewrite the COMPONENT → FILE MAPPING table to route to CLAUDE.md's FILE MAP subtables instead of hardcoding paths directly** (e.g. `content` → "see CLAUDE.md `js/content/` subtable"), so this can't silently drift out of sync with CLAUDE.md a second time - single source of truth instead of two copies to keep in sync.
- **Scope note:** this collapse-duplicates principle applies to the two cases found above, where a file was genuinely re-describing CLAUDE.md's file-ownership content in its own words. It does not mean stripping file paths out of docs generally - audit-prompt scoping (e.g. "check `js/auth.js`"), ticket Remarks citing the file a fix landed in, and CLAUDE.md's own FILE MAP itself all name files because that's their actual job, not a duplicate of something else. The distinction is duplicate-of-the-same-fact vs. a file legitimately needing to name a path for its own purpose.

### Adjacent finding (data hygiene, not file/directory structure - flagged for awareness only)

#### [NOTED, not decided] `docs/tickets-archive.md` has at least 7 WIKI-xxx IDs reused across genuinely different tickets

- **Files:** `docs/tickets-archive.md`, `docs/tickets-backlog.md`
- **Observation:** WIKI-483, 484, 485, 486, 488, 489, 490 each appear as a primary row ID exactly twice, each time with different entry dates and completely unrelated content (verified directly, not a grep artifact - e.g. WIKI-485 is both "Auth button + submit flows missing UI states" (2026-08-03) and "Emoji marker inline placement disrupts reading flow" (2026-07-25); WIKI-490 is both "Auth copy/tone inconsistencies" (2026-07-27) and "Article path format mismatch breaks isRead()" (2026-08-03, still in the active backlog)). The archive already flagged one instance of this exact problem itself (`WIKI-487-dup`, "Flag for ticket-numbering process review") but seven more went uncaught.
- **Why noted here rather than decided:** this is ticket-ID data hygiene (a numbering-process gap, likely two ticket-creation sessions on the same day not checking the current max ID), not a file/directory structure issue - outside this audit's scope to decide a fix for. Flagged for awareness since it surfaced during the full-file verification pass.

### Confirmed clean (checked, no issue found)

Verification method note: every one of the ~205 tracked non-content files in `wiki-fe` was checked in this audit - either read in full (all `docs/`, `data/*.json`, root config/meta files, HTML, service worker) or verified by name + full-tree size sweep + import-graph cross-reference (all `js/`, `css/`, `tests/`, `scripts/` bodies, since file *placement* - this audit's actual scope - doesn't require reading every line of correct, already-correctly-named code; that's `codebase-quality-audit`'s job, not this one).

- `data/` (all 4 JSON files, full content), `icons/` directories - no issues.
- `.claude/settings.json`, `biome.json`, `manifest.json`, `pytest.ini`, `requirements-dev.txt`, `CHANGELOG.md`, `icon.svg`, `wiki-sw.js`, `index.html`, `404.html` - all read in full, intentional, no structural issues.
- `.pre-commit-config.yaml` vs `.pre-commit-config.ci.yaml` - intentionally diverged (local auto-fix vs CI check-only), documented via header comments in both files.
- `.github/workflows/ci.yml` / `Makefile` script references - all point to real, existing `scripts/` files.
- Root-level `.pytest_cache/` - properly gitignored, not accidentally tracked (initial grep against `.gitignore` gave a false alarm; `git status --porcelain --ignored` confirms it's correctly ignored).
- `readme.md` - read in full; structural issues found are logged above (doc-drift bundle), not otherwise clean.
- CSS files other than `layout.css` (7 files over 350 lines) - none dramatically over threshold with an unclear cause; not flagged individually.
- All 9 `docs/_meta/ai-instructions/*.md` files (full read) - internally consistent, correctly cross-referencing each other and their `content/` targets; no misplacement.
- `docs/_meta/plans/dsa-cheatsheets-rollout.md`, `e2e-ci-resource-hardening.md` (full read) - correctly placed, content matches purpose. `fe-be-integration.md` contains many stale `js/storage.js`-style references, but as a frozen historical implementation-plan record (not live guidance, unlike `readme.md`/`tickets.md` above) this is expected and not flagged as an issue.
- `docs/tickets-backlog.md`, `content-archive.md`, `content-backlog.md` (full read) - correctly placed and formed. `docs/tickets-archive.md` (full read in chunks) - correctly placed; one data-hygiene issue noted separately above (ticket-ID collisions), not a structure issue.
- All remaining `docs/_meta/audit-reports/*.md` and `audit-reports/pending/*.md` files - naming/header-identity verified consistent with their filenames and the batching scheme described in `ui-components-audit-agent-prompt.md`; all 4 expected UI-components batches present with none missing or orphaned.
- Full `js/`, `css/`, `tests/`, `scripts/` line-count sweep (every file) - no additional oversized-file candidates beyond what's already listed above (`highlights.js` folded in), and confirmed large test files (`test_content_enhancements.py` at 3433 lines, etc.) are expected/sanctioned under CONVENTIONS.md's testing rules, not a violation - the ~400-line split guidance applies only to `js/`/`css/`, never `tests/`.
