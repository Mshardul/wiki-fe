# UI Components Audit Agent — Prompt

Paste this as the prompt when spawning the agent (e.g. `general-purpose` subagent, or a fresh Claude Code session in `wiki-fe`).

**Roster is large (45 components) — split across parallel agents rather than one sequential run.** Partition the roster below into batches (e.g. by top-level grouping: Content / Chrome+App-level / State-holders+Storage / Orchestration+Views+Misc) and dispatch one agent per batch via `dispatching-parallel-agents`. **Every component belongs to exactly one batch — no component may be assigned to two agents.** This includes shared-primitive components like `graph-engine.js`: keep it and its consumers (`link-graph.js`, `section-map.js`, `index-graph.js`) in the same batch so one agent owns the full picture, rather than splitting them across batches and risking the same bug logged twice under two components. Each agent still runs the full Phase 1 + Phase 2 method per component in its batch, and each writes to its own dated report file (append a batch suffix, e.g. `ui-components-audit-content - YYYYMMDD.md`) to avoid concurrent-write collisions on one file. The **interaction pass** (Known interaction points) is cross-cutting — assign it to exactly one agent (or run it as a final pass after the batches finish) rather than duplicating it across all of them.

---

You are auditing the `wiki-fe` repo (`/Users/shardul/Documents/Github/wiki/wiki-fe`) from the perspective of a senior frontend engineer stress-testing each component's internal logic as if writing unit tests for code that has none. This is a **build-free, vanilla JS/HTML/CSS wiki app** — no React, no bundler, no TypeScript (see `CLAUDE.md` / `CONVENTIONS.md` in repo root, read them first). Your job: find every functional bug, state/lifecycle bug, and edge-case failure — in each component on its own, AND in how components interact with each other — and log each one to a running file as you find it — not at the end, not from memory.

This audit is **not** a UX/visual/viewport audit (see the companion `auth-ux-audit` and `mobile-ux-audit` prompts for those lenses) and **not** a code-quality/consistency audit (see the companion `codebase-quality-audit` prompt). This audit is about correctness: does the logic do what it's supposed to, does state stay clean across interactions and navigation, does it survive reload/multi-tab/offline, does it degrade gracefully when something upstream fails.

## Goal

For every component in the roster below, check it against **5 parameters**:

1. **Isolation correctness** — is the component's own logic right, tested alone? Sort comparators, fuzzy-match scoring, scroll-position math, zoom/pan transform math, active-heading detection, toggle state machines. Does it do the correct thing, not just *a* thing.
2. **State/lifecycle** — does state get reset when it should, and persist when it shouldn't reset? Navigate away mid-interaction and back, reopen a modal, re-render the same view twice, does a listener get double-attached, does a cache/singleton leak stale data across navigations.
3. **Edge-case inputs** — malformed/empty/extreme content specific to that component (empty table, giant mermaid diagram, broken LaTeX, zero-heading article for TOC, 500-item search result set). Does it degrade or throw.
4. **Persistence correctness** — for components backed by localStorage/sessionStorage: does state survive reload, survive a second tab open concurrently, survive going offline and back online, without corrupting or silently dropping data.
5. **Resource/listener lifecycle over time** — not just a single before/after snapshot: navigate between 20-30 articles / open-close a modal 20-30 times, and check whether listener count, cache size, or DOM node count grows unboundedly instead of staying flat.
6. **Failure-path handling** — what happens when a component's upstream dependency fails: an `api.js` call rejects, localStorage throws (quota exceeded / private browsing), cached JSON is malformed, a fetch for markdown content 404s. Does the component fail visibly and gracefully, or silently swallow the error and leave stale/broken UI.

Not every parameter applies to every component (e.g. `home-parallax.js` has no persistence angle) — skip parameters that are genuinely not applicable and note why, don't force a finding.

**Plus a mandatory interaction pass** — see "Known interaction points" below. These are checked regardless of per-component findings, since bugs here only show up when two components run together.

Be exhaustive — quantity and precision both matter more than brevity here.

## Component roster (45)

**Content (`js/content/`)**
1. `zoom-lightbox.js`
2. `code-blocks.js`
3. `mermaid.js`
4. `tables.js`
5. `toc.js`
6. `formatting.js`
7. `glossary-caveats.js`
8. `highlights.js` (per-article text highlights + inline emoji markers, freeze-frame export hookup)
9. `freeze-frame.js` (exports a text selection as a shareable image card)
10. `structure-viz.js` (inline ` ```viz ` fenced-block renderer for data-structure diagrams)
11. `video-embed.js` (bare YouTube/Vimeo URL → responsive iframe embed)
12. `practice-toggle.js` (DSA Approach/Complexity answer blocks → collapsed reveal-on-click toggle)
13. `section-wrap.js` (wraps flat markdown-derived siblings under a heading into nested containers for downstream features — check this one first if a content/*.js enhancer misbehaves, since it runs early in the pipeline and others depend on its output shape)

**Chrome/global**
14. `search.js` (⌘K modal)
15. `storage/settings-theme.js` (preferences modal + Settings/Theme/Sync + multi-tab listener)
16. `auth.js` (functional/state lens only — UX already covered by `auth-ux-audit`)
17. `app/wiki-switcher.js`
18. `app/bookmarks-modal.js`
19. `render/toast.js`
20. topbar (`render/nav-utils.js` + `css/components/topbar.css` — breadcrumb, back button, scroll-to-top, reading progress bar; **include icon correctness in scope** — every topbar icon button resolves to a real `<symbol>` in `sprite.svg` via `icon-sprite.js`, no broken/missing `<use href="#icon-...">` refs, no visually-blank icon buttons)
21. `modal-registry.js` (shared focus-trap + open-state tracking reused by search/auth/bookmarks/wiki-switcher/preferences modals — isolation bugs here likely surface as interaction findings across every modal at once)
22. `icon-sprite.js` (fetches + inlines `sprite.svg` once at boot — isolation correctness: does it fail gracefully if the fetch 404s/is slow, do icon buttons rendered before the sprite loads end up permanently blank or do they recover once it resolves; this is the single point of failure behind every icon-using component's icon correctness check above, so a bug here should be logged once here, not repeated per-consumer)

**App-level**
23. `app/mobile-panels.js` (functional/state lens only — viewport/touch already covered by `mobile-ux-audit`)
24. `app/home-parallax.js`
25. `app/distraction-free.js`
26. `app/study-feedback.js`
27. `app/print.js` (print-article trigger)
28. `app/install-prompt.js` + `storage/install-prompt.js` (PWA install: `beforeinstallprompt` capture + toast, iOS add-to-home-screen nudge, dismissal persistence)
29. `app/graph-engine.js` (shared force-directed sim primitives — node/edge builder, tick/damping — used by link-graph, section-map, index-graph; audit once here, then check each consumer only for its own wiring)
30. `app/link-graph.js` (`g` cross-wiki link-graph overlay from backlinks, click-to-navigate)
31. `app/section-map.js` (`Shift+G` / pinch section-map overlay, read-state colored)
32. `app/complexity-compare.js` (complexity comparator modal: picker + merged Big-O matrix from Data Structures tables)

**State-holders (`storage/`)**
33. `storage/scroll-collapse.js`
34. `storage/read-tracking.js`
35. `storage/bookmarks.js`
36. `storage/recents.js`
37. `storage/offline.js`
38. `storage/completions.js` (per-wiki-per-article completion Set, synced via `api.completions`)
39. `storage/highlights.js` (per-article highlight/marker CRUD, keyed by wiki+article path — persistence half of #8's pair)
40. `storage/notes.js` (per-article notes scratchpad CRUD)
41. `storage/data-clear.js` ("Clear my data" settings action — wipes bookmarks/highlights/notes/pinned-wikis; check it actually clears everything it claims to, nothing more/less)

**Orchestration/routing**
42. `app.js`
43. `render/router.js`
44. `render/content-view.js`

**Other views**
45. `render/home-index.js`
46. `render/changelog-view.js`
47. `render/related-articles.js`
48. `render/admin-view.js` (admin panel: broken-links/backlinks/search-index reports for admin-role users)
49. `render/index-graph.js` (home/index-view node graph overlay per-wiki, built on `app/graph-engine.js`)
50. `render/offline-view.js` (`#offline` view: cached articles list, last-cached date, per-article evict button)
51. `render/dashboard-view.js` (progress dashboard: one card per vertical, read%/completed% against that vertical's article count, pure aggregation over `completions`+`read-tracking` — hidden if a vertical has zero articles)

**Misc**
52. `app/debug-overlay.js`
53. `api.js` — parameters translate differently here since it's not a UI component: **isolation correctness** = base-URL detection across environments, `ApiError` parsing correctness, the global 401 handler firing exactly once per real 401 (not per request, not zero times); **resource/listener lifecycle** likely doesn't apply (no DOM listeners) — note and skip rather than force a finding.

Numbering above is sequential for readability, not a strict count guarantee — treat the list itself as the source of truth, not the "(45)" label, and re-verify against `find js -name "*.js"` if this prompt file is reused after further app changes.

## Known interaction points (fixed list — update this list as the app evolves; agent should treat
this as a required-minimum checklist and may append genuinely new findings in a separate bucket, not silently expand this list)

- **Scroll ownership**: TOC scroll-sync vs `distraction-free.js` vs `scroll-collapse.js` vs mobile drawer open — who owns `scrollTop` when more than one is active?
- **Modal stacking**: search / preferences / auth / bookmarks / wiki-switcher / link-graph (`g`) / section-map (`Shift+G`) / complexity-compare — can two open at once? Does opening one fail to close another? Z-index conflicts? (each now has its own `--z-*` token in `css/tokens.css` — check for gaps/collisions across the full set, not just the original five.)
- **Body scroll-lock**: any modal open simultaneously with mermaid zoom-lightbox, TOC drawer, link-graph, or section-map — competing lock/unlock calls; does closing one unlock the body while another is still open?
- **Focus mode / distraction-free vs TOC/topbar** — do they fight over which chrome is hidden?
- **Content re-render on navigation**: navigating between articles — do `content/*` modules (mermaid, code-blocks, toc, glossary-caveats) properly tear down and reinit, or does stale state (event listeners, caches) leak from the previous article into the new one?
- **Settings change mid-interaction**: theme/font-size change while a modal is open, or mid-zoom — does re-render break the active component's state?
- **Toast queue vs open modal** — does a toast fire while a modal is open; is it visible, or hidden behind the modal. Confirmed still current as of this prompt's last edit via `tokens.css` z-index scale: `.wiki-toast` (`css/components/toast.css:19`) uses `--z-modal-backdrop` (1100), while search modal uses `--z-search-modal` (2000) and preferences modal uses `--z-prefs-modal` (3000) — a toast firing while either is open renders behind it. Auth modal's main panel (`--z-auth-modal`, 1000) is also below the toast, so a toast there would render on top correctly, but auth's migrate-modal sub-dialog (`--z-max`, 9999) would bury the toast too. Verify this live and log the confirmed cases (originally reported in `manual-ui-audit - 20260714.md`, misc section, toast cut-off/behind-boundary at login). Also check queue ordering/timing against boot-time toasts from other sources (e.g. `app/install-prompt.js`'s install/iOS-nudge toasts) — which one wins the queue, does a long-duration toast block a more time-sensitive one behind it.

## Method: code read first, then live verification

**Phase 1 — static read-through, component by component:** Use `ctx_batch_execute`/`ctx_execute_file` (not `Read`) to go through each component's JS + CSS pair. Trace: what state does it own, what triggers a render/re-render, what listeners does it attach and when/whether they're removed, what does it read/write in localStorage, what does it assume about its upstream data. Note anything suspicious as a **hypothesis** — don't log it as confirmed until Phase 2 verifies it against real behavior. Code reading is the primary method for this audit — most findings should be resolvable from the source alone (a stale-closure bug, a missing disconnect call, a comparator that isn't transitive are all visible on the page). Only fall through to Phase 2 for what code reading genuinely cannot answer: how a specific browser actually renders/times something, real cross-tab sync, live network-failure behavior, or confirming a timing-sensitive hypothesis (e.g. the flash-of-expanded-content case already flagged as HYPOTHESIS above).

Do not run any tests — full suite or individual files. Assume the existing `tests/e2e/test_*.py` suite is correct and passing; this audit is a fresh manual pass, not a test run.

**Phase 2 — live browser verification, only where Phase 1 can't settle it:** Serve the site locally (same pattern as `tests/conftest.py`'s `base_url` fixture) through the virtual environment (`.venv` in repo root). Use Playwright MCP tools narrowly — to check the specific hypothesis in question, not to re-walk every component's UI. Techniques specific to this audit's parameters:

- **Listener/lifecycle checks**: use `browser_evaluate` to count attached listeners on a target element (or track via a wrapped `addEventListener` monkey-patch injected at page load) before and after repeated navigation/open-close cycles — confirm counts stay flat, not monotonically growing.
- **State staleness checks**: use `browser_evaluate` to inspect relevant `window`/module-level state objects (or the visible DOM) immediately after navigating away from and back to a view — confirm no stale data from the prior article/session is visible.
- **Persistence checks**: use `browser_evaluate` to read `localStorage`/`sessionStorage` directly before/after reload, and open a second tab (`browser_tabs`) to confirm cross-tab sync behavior where `settings-theme.js`'s multi-tab listener is supposed to apply.
- **Failure-path checks**: use `browser_network_requests`/route interception to force an `api.js` call to fail, or `browser_evaluate` to corrupt a localStorage key's JSON, then observe the dependent component's behavior.
- **Resource-growth checks**: script a loop of 20-30 navigations or modal open/closes via `browser_evaluate` or repeated tool calls, then re-check listener/cache counts.

No network throttling available reliably — skip it; simulate failure via route interception instead.

## Output file

Log to **`docs/_meta/audit-reports/ui-components-audit - YYYYMMDD.md`** (today's date, one file per run — no separate live-working-copy file). If running as parallel batches per the split above, each agent logs to its own suffixed file during the run (`ui-components-audit-content - YYYYMMDD.md`, `ui-components-audit-chrome - YYYYMMDD.md`, etc.) — do not have multiple agents write the same file concurrently. **This audit must produce exactly one final report file, regardless of how many batches ran.** The dispatching (main) agent owns consolidation: after all batch agents finish, merge every suffixed batch file into the single unsuffixed `ui-components-audit - YYYYMMDD.md` (concatenate each batch's `Findings by component`/`Findings by interaction` entries into the shared sections, dedup nothing — these are disjoint components/interactions per batch, not overlapping candidates), then delete the suffixed per-batch files so only the merged file remains in `pending/`. Downstream ticket-filing reads one report per audit run, not one per batch. Two-stage write pattern within each batch file so nothing is lost mid-run, but the final merged file stays organized:

- **As you find each issue**, immediately append it as a flat entry under a top-level `## Raw log` section at the bottom of the file (create on first write). Do this the moment you find it — do not batch findings in memory and write at the end.
- **Periodically (after finishing each component, and after finishing the interaction pass)**, move those entries up into the proper section under `## Findings by component` or `## Findings by interaction`, sorted critical → major → minor within the section, and delete them from the raw log.

### Entry format

```markdown
### [SEVERITY] Short title

- **Type:** isolation | interaction
- **Component(s):** `js/content/toc.js` (isolation) — or `js/content/toc.js` + `js/app/distraction-free.js` (interaction)
- **Parameter:** isolation correctness | state/lifecycle | edge-case input | persistence | resource lifecycle | failure-path
- **File:** `js/content/toc.js:88`
- **Repro:** Expand a TOC entry with no subsections → chevron renders anyway. Click any chevron →
  always the last-rendered entry's section toggles, not the one clicked
- **Impact:** TOC navigation becomes unusable once more than one entry is present; user cannot
  reliably expand/collapse specific sections
- **Fix direction:** chevron click handler likely bound via shared closure/index instead of
  per-element reference — probably a stale-closure-in-loop bug
```

For a parameter that's genuinely not applicable to a component (per the Goal section's skip rule), don't write a full entry — just a one-line note under that component's heading, e.g. `- persistence: N/A, no localStorage/sessionStorage use`.

Severity = `CRITICAL` (breaks a core flow or corrupts persisted data), `MAJOR` (real bug with noticeable impact under normal use), `MINOR` (edge case or low-likelihood sequence), `POLISH` (nitpick). For **interaction** findings specifically: severity scales with how common the triggering sequence is in real use — a bug hit by "open search modal while TOC is open" (common) is at least MAJOR; a bug hit only by an obscure 4-step sequence a real user is unlikely to hit is MINOR even if the underlying break is total.

Final file structure:

```markdown
# UI Components Audit

Generated by UI components audit agent. Covers functional/state/persistence/lifecycle correctness
per component AND cross-component interaction bugs. Not a UX, viewport, or code-quality audit — see
companion prompts for those.

## Findings by component

### zoom-lightbox.js
### code-blocks.js
### mermaid.js
### tables.js
### toc.js
### formatting.js
### glossary-caveats.js
### highlights.js (content)
### freeze-frame.js
### structure-viz.js
### video-embed.js
### practice-toggle.js
### section-wrap.js
### search.js
### settings-theme.js
### auth.js
### wiki-switcher.js
### bookmarks-modal.js
### toast.js
### topbar (nav-utils.js)
### modal-registry.js
### icon-sprite.js
### mobile-panels.js
### home-parallax.js
### distraction-free.js
### study-feedback.js
### print.js
### install-prompt.js (app + storage)
### graph-engine.js
### link-graph.js
### section-map.js
### complexity-compare.js
### scroll-collapse.js
### read-tracking.js
### bookmarks.js
### recents.js
### offline.js
### completions.js
### highlights.js (storage)
### notes.js
### data-clear.js
### app.js
### router.js
### content-view.js
### home-index.js
### changelog-view.js
### related-articles.js
### admin-view.js
### index-graph.js
### offline-view.js
### dashboard-view.js
### debug-overlay.js
### api.js

## Findings by interaction

### Scroll ownership
### Modal stacking
### Body scroll-lock
### Focus mode vs chrome visibility
### Content re-render on navigation
### Settings change mid-interaction
### Toast queue vs open modal
### Additional interaction findings (not on the fixed list)

## Raw log
(empty once fully organized)
```

## Constraints

- **Do not fix anything.** This is audit-only — report, don't patch. If a fix is obvious, note it in "Fix direction" but leave the code untouched.
- **Do not read `content/**/*.md`** — irrelevant to this audit.
- **Do not run any tests** — full suite or individual files. Assume `tests/e2e/test_*.py` is correct and passing.
- Follow `CLAUDE.md`'s file-map guidance for anything not already listed in the roster above.
- No `git add`/`commit`/`push`.

## When done

Each batch agent summarizes in its final message: total findings by severity count for its batch, split isolation vs interaction, and its own 3–5 most critical issues by name. Full detail lives in that batch's file, not in the response.

**If run as parallel batches**, after all batch agents finish, the dispatching agent (not a new sub-agent) does the consolidation described in "Output file" above: merge all suffixed batch files into the single unsuffixed `ui-components-audit - YYYYMMDD.md`, delete the suffixed files, then report a rollup summary to the user — total findings across all batches by severity count, split isolation vs interaction, and the overall 3–5 most critical issues by name across the whole roster.
