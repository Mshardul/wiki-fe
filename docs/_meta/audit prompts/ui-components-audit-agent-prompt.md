# UI Components Audit Agent — Prompt

Paste this as the prompt when spawning the agent (e.g. `general-purpose` subagent, or a fresh
Claude Code session in `wiki-fe`).

---

You are auditing the `wiki-fe` repo (`/Users/shardul/Documents/Github/wiki/wiki-fe`) from the
perspective of a senior frontend engineer stress-testing each component's internal logic as if
writing unit tests for code that has none. This is a **build-free, vanilla JS/HTML/CSS wiki app** —
no React, no bundler, no TypeScript (see `CLAUDE.md` / `CONVENTIONS.md` in repo root, read them
first). Your job: find every functional bug, state/lifecycle bug, and edge-case failure — in each
component on its own, AND in how components interact with each other — and log each one to a
running file as you find it — not at the end, not from memory.

This audit is **not** a UX/visual/viewport audit (see the companion `auth-ux-audit` and
`mobile-ux-audit` prompts for those lenses) and **not** a code-quality/consistency audit (see the
companion `codebase-quality-audit` prompt). This audit is about correctness: does the logic do what
it's supposed to, does state stay clean across interactions and navigation, does it survive
reload/multi-tab/offline, does it degrade gracefully when something upstream fails.

## Goal

For every component in the roster below, check it against **5 parameters**:

1. **Isolation correctness** — is the component's own logic right, tested alone? Sort comparators,
   fuzzy-match scoring, scroll-position math, zoom/pan transform math, active-heading detection,
   toggle state machines. Does it do the correct thing, not just *a* thing.
2. **State/lifecycle** — does state get reset when it should, and persist when it shouldn't reset?
   Navigate away mid-interaction and back, reopen a modal, re-render the same view twice, does a
   listener get double-attached, does a cache/singleton leak stale data across navigations.
3. **Edge-case inputs** — malformed/empty/extreme content specific to that component (empty table,
   giant mermaid diagram, broken LaTeX, zero-heading article for TOC, 500-item search result set).
   Does it degrade or throw.
4. **Persistence correctness** — for components backed by localStorage/sessionStorage: does state
   survive reload, survive a second tab open concurrently, survive going offline and back online,
   without corrupting or silently dropping data.
5. **Resource/listener lifecycle over time** — not just a single before/after snapshot: navigate
   between 20-30 articles / open-close a modal 20-30 times, and check whether listener count,
   cache size, or DOM node count grows unboundedly instead of staying flat.
6. **Failure-path handling** — what happens when a component's upstream dependency fails: an
   `api.js` call rejects, localStorage throws (quota exceeded / private browsing), cached JSON is
   malformed, a fetch for markdown content 404s. Does the component fail visibly and gracefully, or
   silently swallow the error and leave stale/broken UI.

Not every parameter applies to every component (e.g. `home-parallax.js` has no persistence angle) —
skip parameters that are genuinely not applicable and note why, don't force a finding.

**Plus a mandatory interaction pass** — see "Known interaction points" below. These are checked
regardless of per-component findings, since bugs here only show up when two components run
together.

Be exhaustive — quantity and precision both matter more than brevity here.

## Component roster (31)

**Content (`js/content/`)**
1. `zoom-lightbox.js`
2. `code-blocks.js`
3. `mermaid.js`
4. `tables.js`
5. `toc.js`
6. `formatting.js`
7. `glossary-caveats.js`

**Chrome/global**
8. `search.js` (⌘K modal)
9. `storage/settings-theme.js` (preferences modal + Settings/Theme/Sync + multi-tab listener)
10. `auth.js` (functional/state lens only — UX already covered by `auth-ux-audit`)
11. `app/wiki-switcher.js`
12. `app/bookmarks-modal.js`
13. `render/toast.js`
14. topbar (`render/nav-utils.js` + `css/components/topbar.css` — breadcrumb, back button,
    scroll-to-top, reading progress bar)

**App-level**
15. `app/mobile-panels.js` (functional/state lens only — viewport/touch already covered by
    `mobile-ux-audit`)
16. `app/home-parallax.js`
17. `app/distraction-free.js`
18. `app/study-feedback.js`

**State-holders (`storage/`)**
19. `storage/scroll-collapse.js`
20. `storage/read-tracking.js`
21. `storage/bookmarks.js`
22. `storage/recents.js`
23. `storage/offline.js`

**Orchestration/routing**
24. `app.js`
25. `render/router.js`
26. `render/content-view.js`

**Other views**
27. `render/home-index.js`
28. `render/changelog-view.js`
29. `render/related-articles.js`

**Misc**
30. `app/debug-overlay.js`
31. `api.js`

## Known interaction points (fixed list — update this list as the app evolves; agent should treat
this as a required-minimum checklist and may append genuinely new findings in a separate bucket,
not silently expand this list)

- **Scroll ownership**: TOC scroll-sync vs `distraction-free.js` vs `scroll-collapse.js` vs mobile
  drawer open — who owns `scrollTop` when more than one is active?
- **Modal stacking**: search / preferences / auth / bookmarks / wiki-switcher — can two open at
  once? Does opening one fail to close another? Z-index conflicts?
- **Body scroll-lock**: any modal open simultaneously with mermaid zoom-lightbox or TOC drawer —
  competing lock/unlock calls; does closing one unlock the body while another is still open?
- **Focus mode / distraction-free vs TOC/topbar** — do they fight over which chrome is hidden?
- **Content re-render on navigation**: navigating between articles — do `content/*` modules
  (mermaid, code-blocks, toc, glossary-caveats) properly tear down and reinit, or does stale state
  (event listeners, caches) leak from the previous article into the new one?
- **Settings change mid-interaction**: theme/font-size change while a modal is open, or mid-zoom —
  does re-render break the active component's state?
- **Toast queue vs open modal** — does a toast fire while a modal is open; is it visible, or hidden
  behind the modal (see `manual-ui-audit - 20260714.md` misc section — a real prior report of a
  toast rendering cut-off/behind-boundary at login)?

## Method: code read first, then live verification

**Phase 1 — static read-through, component by component:**
Read each component's JS + CSS pair. Trace: what state does it own, what triggers a
render/re-render, what listeners does it attach and when/whether they're removed, what does it
read/write in localStorage, what does it assume about its upstream data. Note anything suspicious
as a **hypothesis** — don't log it as confirmed until Phase 2 verifies it against real behavior.

**Phase 2 — live browser verification:**
Serve the site locally (same pattern as `tests/conftest.py`'s `base_url` fixture) through the
virtual environment (`.venv` in repo root). Use Playwright MCP tools to drive each component and
the interaction-point list above. Techniques specific to this audit's parameters:

- **Listener/lifecycle checks**: use `browser_evaluate` to count attached listeners on a target
  element (or track via a wrapped `addEventListener` monkey-patch injected at page load) before and
  after repeated navigation/open-close cycles — confirm counts stay flat, not monotonically
  growing.
- **State staleness checks**: use `browser_evaluate` to inspect relevant `window`/module-level state
  objects (or the visible DOM) immediately after navigating away from and back to a view — confirm
  no stale data from the prior article/session is visible.
- **Persistence checks**: use `browser_evaluate` to read `localStorage`/`sessionStorage` directly
  before/after reload, and open a second tab (`browser_tabs`) to confirm cross-tab sync behavior
  where `settings-theme.js`'s multi-tab listener is supposed to apply.
- **Failure-path checks**: use `browser_network_requests`/route interception to force an `api.js`
  call to fail, or `browser_evaluate` to corrupt a localStorage key's JSON, then observe the
  dependent component's behavior.
- **Resource-growth checks**: script a loop of 20-30 navigations or modal open/closes via
  `browser_evaluate` or repeated tool calls, then re-check listener/cache counts.

No network throttling available reliably — skip it; simulate failure via route interception instead.

## Output file

Log to **`docs/_meta/audit-reports/ui-components-audit - YYYYMMDD.md`** (today's date, one file per
run — no separate live-working-copy file). Two-stage write pattern within that single file so
nothing is lost mid-run, but the final file stays organized:

- **As you find each issue**, immediately append it as a flat entry under a top-level `## Raw log`
  section at the bottom of the file (create on first write). Do this the moment you find it — do
  not batch findings in memory and write at the end.
- **Periodically (after finishing each component, and after finishing the interaction pass)**, move
  those entries up into the proper section under `## Findings by component` or
  `## Findings by interaction`, sorted critical → major → minor within the section, and delete them
  from the raw log.

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

Severity = `CRITICAL` (breaks a core flow or corrupts persisted data), `MAJOR` (real bug with
noticeable impact under normal use), `MINOR` (edge case or low-likelihood sequence), `POLISH`
(nitpick). For **interaction** findings specifically: severity scales with how common the
triggering sequence is in real use — a bug hit by "open search modal while TOC is open" (common) is
at least MAJOR; a bug hit only by an obscure 4-step sequence a real user is unlikely to hit is MINOR
even if the underlying break is total.

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
### search.js
### settings-theme.js
### auth.js
### wiki-switcher.js
### bookmarks-modal.js
### toast.js
### topbar (nav-utils.js)
### mobile-panels.js
### home-parallax.js
### distraction-free.js
### study-feedback.js
### scroll-collapse.js
### read-tracking.js
### bookmarks.js
### recents.js
### offline.js
### app.js
### router.js
### content-view.js
### home-index.js
### changelog-view.js
### related-articles.js
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

- **Do not fix anything.** This is audit-only — report, don't patch. If a fix is obvious, note it
  in "Fix direction" but leave the code untouched.
- **Do not read `content/**/*.md`** — irrelevant to this audit.
- **Do not run the full pytest suite.** You may run individual existing `tests/e2e/test_*.py` cases
  read-only for reference/comparison against your own findings.
- Follow `CLAUDE.md`'s file-map guidance for anything not already listed in the roster above.
- No `git add`/`commit`/`push`.

## When done

Summarize in your final message: total findings by severity count, split isolation vs interaction,
and the 3–5 most critical issues by name. Full detail lives in the file, not in your response.
