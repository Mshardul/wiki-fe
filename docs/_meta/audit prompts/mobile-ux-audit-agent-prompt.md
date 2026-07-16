# Mobile UX Audit Agent — Prompt

Paste this as the prompt when spawning the agent (e.g. `general-purpose` subagent, or a fresh
Claude Code session in `wiki-fe`).

---

You are auditing the `wiki-fe` repo (`/Users/shardul/Documents/Github/wiki/wiki-fe`) from the
perspective of a mobile-first UI/UX developer. This is a **build-free, vanilla JS/HTML/CSS wiki
app** — no React, no bundler, no TypeScript (see `CLAUDE.md` / `CONVENTIONS.md` in repo root, read
them first). Your job: find every mobile usability gap, bug, and rough edge a real user would hit
on a phone, and log each one to a running file as you find it — not at the end, not from memory.

## Goal

Walk through **every page/view and every interactive component** as if you were a user on a phone,
across a range of screen sizes. List every issue you find, big or small: broken layouts, overflow,
unreachable/too-small touch targets, hover-only interactions with no touch equivalent, fixed
widths that don't reflow, modals that don't fit small viewports, z-index/stacking bugs, text
truncation, font scaling issues, viewport meta problems, gesture conflicts, perf smells (unlazy
images, render-blocking external fonts/scripts), orientation-change breakage, missing
safe-area-inset handling, OS text-zoom/font-scaling breakage, momentum-scroll/rubber-band
conflicts with open modals, and PWA/standalone-mode quirks — and anything else that would
frustrate a mobile user. Be exhaustive — quantity and precision both matter more than brevity
here.

## Method: code read first, then browser verification

**Phase 1 — static read-through (per component):**
For each view/component (see checklist below), read its CSS + JS pair and reason about mobile
behavior: fixed px widths, missing media query coverage, `:hover`-only affordances, min-width
touch targets under 44x44px, absolute positioning that could overflow small viewports, z-index
conflicts between modals/topbar/TOC drawer, missing `touch-action`, scroll-locking issues, etc.
Note anything suspicious as a **hypothesis** — don't log it as confirmed yet.

**Phase 2 — live browser verification:**
Serve the site locally. Run `python3 -m http.server` in the background (check if the port is already in use first, or choose a free port) from the `wiki-fe` root, or reuse an existing active test server.

When invoking Playwright MCP tools, ensure the browser context is configured to emulate a mobile device if possible (specifically set/ensure `isMobile: true` and `hasTouch: true`). This is crucial because standard mouse clicks won't trigger touch-specific event listeners and might keep CSS `:hover` states active, which behaves differently from actual touch screen releases.

Use the Playwright MCP tools (`browser_navigate`, `browser_resize`, `browser_snapshot`/`browser_take_screenshot`, `browser_click`, `browser_evaluate`, etc.) to:

1. Load each page/view.
2. Resize to each viewport in the matrix below.
3. Take a screenshot + accessibility snapshot at each size.
4. Interact with every interactive element (open modals, expand TOC, trigger swipe/gesture code
   paths, tap buttons) to catch bugs that only show up on interaction, not just static layout.
5. Confirm or discard each Phase-1 hypothesis, and capture new issues you only see live (actual
   overflow, actual clipped text, actual unreachable button behind a fixed topbar, etc).

No network throttling — Playwright MCP here has no reliable built-in throttle control. Skip it;
just flag network/perf smells you notice in code (unlazy `<img>`, blocking `<link>` fonts, heavy
sync `mermaid.js`/`katex` loads) as findings instead.

### Viewport matrix

Test every page at all four:

| Label | Width | Notes |
|---|---|---|
| Small Android | 360px | Galaxy S-class baseline |
| iPhone SE/mini | 375px | common small iPhone |
| iPhone 14/15 Pro | 393px | modern iPhone baseline |
| Tablet/iPad mini portrait | 768px | upper boundary — where `responsive.css` breakpoints likely change behavior |

Use a reasonable height (e.g. 800px) unless a specific issue needs short-viewport testing (e.g.
modal overflow with keyboard open — note this as a limitation if you can't simulate a real
software keyboard).

Also test **orientation change**: for at least the 375px and 393px profiles, resize to the
landscape dimensions too (e.g. 667×375, 852×393) and re-check modals, TOC drawer, and sticky
header. Landscape phone height is the classic case where fixed-height/sticky elements eat the
whole viewport.

Also assess **landscape keyboard vertical space constraints**: simulate/evaluate how input fields,
search results, and actions behave when vertical height is severely restricted (e.g. simulated height
of 250px) to mimic the presence of an on-screen keyboard. Ensure modals remain scrollable and
crucial buttons aren't pushed permanently off-screen or covered by layout wrappers.

## Pages / components checklist

Work through these in order. Use `CLAUDE.md`'s file map to find the CSS/JS pair for each — do not
grep blindly.

1. **Home view** — `js/render/home-index.js`, `css/view-home.css`, `js/app/home-parallax.js`.
   Wiki card grid, hero, filter/swipe/hover interactions on cards.
2. **Index view** — `js/render/home-index.js` (index sections), `css/view-index.css`. Section
   headers, index card grid, recents strip, bookmarks strip.
3. **Content/article view** — `js/render/content-view.js`, `css/view-content/layout.css`. Sticky
   header, article hero, TOC sidebar, markdown body, headings/lists/links.
   - **TOC** — `js/content/toc.js`, `css/view-content/layout.css`. Sticky section header,
     collapse, progress ring — this is likely a mobile drawer; check open/close, backdrop, swipe.
   - **Code blocks** — `js/content/code-blocks.js`, `css/view-content/code.css`. Copy button
     reachability, horizontal scroll cue, line numbers on narrow width.
   - **Mermaid diagrams** — `js/content/mermaid.js`, `css/view-content/mermaid.css`. Diagrams are
     a classic mobile failure point — check zoom/pan/pinch, step-through controls, overflow.
   - **Tables** — `js/content/tables.js`, `css/view-content/code.css` (table rules). Column sort
     tap targets, scroll cue, quiz-me mode on narrow width.
   - **Zoom/lightbox** — `js/content/zoom-lightbox.js`, `css/view-content/mermaid.css`. Pinch/pan/
     swipe gesture correctness on touch.
   - **Callouts/prereqs** — `js/content/formatting.js`, `css/view-content/callouts-prereqs.css`.
   - **Interactive content** — `js/content/formatting.js` (focus mode, in-article find, LaTeX
     toggle, tabbed code blocks, footnotes), `css/view-content/interactive.css`.
   - **Glossary/related** — `js/content/glossary-caveats.js`, `js/render/related-articles.js`,
     `css/view-content/glossary-related.css`. Popover positioning on small screens.
4. **Global search modal (⌘K)** — `js/search.js`, `css/components/search-modal.css`. On mobile
   there's no ⌘K — check what triggers it, whether the modal fits small viewports, whether the
   on-screen keyboard would cover results.
5. **Preferences/settings modal** — `js/storage/settings-theme.js`, `css/components/
   preferences-modal.css`. Swatches, keyboard-shortcuts tab (irrelevant on mobile — check it's
   hidden/adapted, not just broken).
6. **Auth modal** — `js/auth.js`, `css/components-auth.css`. Login/register/verify panels, password
   checklist readability on narrow width, error states.
7. **Topbar/nav** — `css/components/topbar.css`, `js/render/nav-utils.js`. Breadcrumb, back button,
   scroll-to-top, reading-time badge, reading progress bar — check for overflow/truncation with
   long article titles at 360px.
8. **Wiki switcher** — `js/app/wiki-switcher.js`, `css/components/wiki-switcher.css`.
9. **Mobile-specific code** — `js/app/mobile-panels.js` (this is presumably the TOC drawer /
   gesture layer — audit it directly and thoroughly, it's the file most likely to contain
   mobile-only bugs), `js/app/distraction-free.js`.
10. **Toast notifications** — `js/render/toast.js`, `css/components/toast.css`. Position/overlap
    with topbar or bottom-sheet UI on small screens.
11. **404 page** — `404.html`.
12. **Responsive breakpoints themselves** — read `css/responsive.css` end-to-end as its own pass;
    cross-check every breakpoint against the 4 viewports above for gaps (e.g. a rule that kicks in
    at 400px leaves 360–399px unstyled).
13. **Safe-area-insets & Viewport Meta** — grep for `env(safe-area-inset` / `viewport-fit=cover` in CSS
    and `index.html`.
    - Check if `<meta name="viewport">` has `viewport-fit=cover` and correct sizing declarations. If absent,
      flag every fixed-position edge-hugging element (topbar, bottom sheet, TOC drawer, toast, sticky footer)
      as a hypothesis for notch/home-indicator overlap on iPhone; note as a limitation that Playwright can't
      truly simulate a notched device, so this is a code-read finding, not a live-verified one.
    - Check for iOS input auto-zoom: Verify that all text input fields, textareas, and select elements
      have a computed/defined `font-size` of at least `16px` on mobile screens. If any are under `16px`,
      flag them as causing unwanted page auto-zoom on iOS focus.
14. **Text zoom / OS font-scaling** — use `browser_evaluate` to set
    `document.documentElement.style.fontSize` (or zoom) to simulate 150%/200% OS text-size boost,
    at 360px and 393px. Check for text/button overlap, truncated labels, modal content pushed
    off-screen, fixed-height containers clipping enlarged text.
15. **Momentum scroll / rubber-banding vs modals** — check `js/app/mobile-panels.js` and any modal
    (search, preferences, auth, TOC drawer) for scroll-lock on the body when a modal/drawer is
    open (`overflow: hidden` on `<body>`, or a scroll-lock utility). If missing or incomplete,
    flag: background page can rubber-band/scroll behind an open modal on iOS Safari, a common
    source of visible content shift or a "stuck" scroll position after closing.
16. **PWA / add-to-homescreen** — check for `manifest.json`/`manifest.webmanifest` link in
    `index.html` and `wiki-sw.js` service worker scope. If a manifest exists: verify
    `display: standalone` (or similar) viewport behaves correctly — no browser chrome assumptions
    baked into layout (e.g. safe-area again, status-bar color via `theme-color` meta). If no
    manifest, note as out-of-scope rather than a finding.

## Output file

Log to **`docs/_meta/audit-reports/mobile-ux-audit - YYYYMMDD.md`** (today's date; create the file
and, if absent, the `audit-reports/` directory). Two-stage write pattern so nothing
is ever lost mid-run, but the final file stays organized:

- **As you find each issue**, immediately append it as a flat entry under a top-level `## Raw log`
  section at the bottom of the file (create on first write). Do this the moment you find it — do
  not batch findings in memory and write at the end.
- **Periodically (after finishing each numbered checklist item above)**, move that item's raw-log
  entries up into a proper section for that page/component under `## Findings by page/component`,
  sorted critical → major → minor within the section, and delete them from the raw log. This keeps
  the raw log as a safety net only, and the top of the file as the organized, fixable output.

### Entry format

```markdown
### [SEVERITY] Short title

- **Page/component:** Content view — TOC drawer
- **File:** `js/app/mobile-panels.js:142`
- **Viewport(s):** 360px, 375px
- **Repro:** Open article → tap TOC toggle → drawer opens but backdrop click doesn't close it
- **Impact:** User gets stuck with drawer open, must reload page
- **Fix direction:** backdrop click handler likely missing or event target check is wrong
```

Severity = `CRITICAL` (blocks core task / data loss / unusable), `MAJOR` (significantly degrades
usability but workaround exists), `MINOR` (polish, inconsistency, small annoyance).

Final file structure:

```markdown
# Mobile UX Audit

Generated by mobile UX audit agent. Viewports tested: 360px, 375px, 393px, 768px (+ landscape
variants of 375px/393px for orientation-change checks).

## Findings by page/component

### Home view
### Index view
### Content view — layout
### Content view — TOC
### Content view — code blocks
### Content view — mermaid diagrams
### Content view — tables
### Content view — zoom/lightbox
### Content view — callouts/prereqs
### Content view — interactive (focus mode, find, LaTeX, tabs, footnotes)
### Content view — glossary/related
### Global search modal
### Preferences modal
### Auth modal
### Topbar/nav
### Wiki switcher
### Mobile panels / gestures
### Toast notifications
### 404 page
### Responsive breakpoints (cross-cutting)
### Safe-area-insets (cross-cutting)
### Text zoom / OS font-scaling (cross-cutting)
### Momentum scroll / rubber-banding vs modals (cross-cutting)
### PWA / add-to-homescreen

## Raw log
(empty once fully organized)
```

## Constraints

- **Do not fix anything.** This is audit-only — report, don't patch. If a fix is obvious, note it
  in "Fix direction" but leave the code untouched.
- **Do not read `content/**/*.md`** — irrelevant to this audit (per `CLAUDE.md`).
- **Do not run the full pytest suite.** You may run individual existing mobile-related tests
  read-only for reference if useful, but this audit is a fresh manual pass, not a test run.
- Follow `CLAUDE.md`'s file-map guidance — don't read every file in `content/`, `render/`,
  `storage/`, `app/` blindly; use the subtables to go straight to the relevant file per checklist
  item above.
- No `git add`/`commit`/`push`.

## When done

Summarize in your final message: total findings by severity count, and the 3–5 most critical
issues by name. Full detail lives in the file, not in your response.
