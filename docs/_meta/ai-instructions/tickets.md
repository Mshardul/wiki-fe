# AI Instructions - Tickets

> Reference this file whenever ticket intent is detected: WIKI-xxx ID mentioned, or phrases like "work on tickets", "which ticket", "decide ticket", "let's pick a ticket".
> Read `docs/tickets-backlog.md` for active tickets; `docs/tickets-archive.md` for Done/Dropped history.
>
> **Not for content articles.** Content quality work uses `docs/_meta/ai-instructions/content-backlog.md` (`DSA-xxx` / `SD-xxx`). Never call those tickets; never file them here.

---

## BACKLOG SCHEMA

Same columns in both `tickets-backlog.md` and `tickets-archive.md`:

| Column       | Values / Notes                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| ID           | `WIKI-xxx` - sequential, never reuse. IDs are unique across both files - check both when assigning a new one.       |
| Entry Date   | ISO date added to backlog                                                                                           |
| Summary      | ≤7 words                                                                                                            |
| Type         | `feature` / `bug` / `ux` / `perf` / `a11y` / `refactor` / `dx` / `cleanup` / `security` - see canonical rules below |
| Component    | Which module(s) - pipe-separated (e.g., `search \| content`) - see canonical values below                           |
| Description  | ≤30 words - what to build/fix                                                                                       |
| Status       | `Backlog` / `In Progress` (in `tickets-backlog.md`); `Done` / `Dropped` (in `tickets-archive.md`)                    |
| Impl. Date   | ISO date implemented; `-` if not done                                                                               |
| Remarks      | ≤30 words - implementation notes, supersession info                                                                 |
| Priority     | `p0` (critical) → `p1` (high) → `p2` (medium) → `p3` (low) → `p4` (very low)                                        |
| Story Points | Sizing estimate - see `docs/_meta/decisions/story-points-estimation.md`                                             |

A few legacy rows in `tickets-archive.md` use `Skipped` or `Closed` instead of `Dropped`/`Done` - left as-is, treat both as archived/terminal.

**Canonical Type values** (from `docs/_meta/decisions/tickets.md`):

| Type       | When to use                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| `feature`  | New capability the user didn't have before                                  |
| `bug`      | Something broken or behaving incorrectly (includes security fixes)          |
| `ux`       | Existing thing works better - no new capability added                       |
| `a11y`     | Accessibility specifically (ARIA, focus, screen reader)                     |
| `perf`     | Speed, memory, or load-time improvement                                     |
| `refactor` | Restructure without behaviour change                                        |
| `dx`       | Tooling, CI, pre-commit, developer workflow (includes content/meta changes) |
| `cleanup`  | Dead code removal, file deletion, housekeeping                              |

Note: older tickets may use `security` or `cleanup` as types - these are acceptable in practice.

**Canonical Component values** (from `docs/_meta/decisions/tickets.md`):

| Component  | Covers                                                       |
| ---------- | ------------------------------------------------------------ |
| `ui`       | CSS, layout, visual presentation, HTML structure             |
| `search`   | ⌘K global search, section filter, result rendering           |
| `nav`      | TOC, breadcrumbs, routing, hash navigation, keyboard nav     |
| `settings` | Settings panel, theme, font, preferences                     |
| `storage`  | localStorage, sessionStorage, persistence, scroll/read state |
| `content`  | Markdown rendering, syntax highlighting, math, diagrams      |
| `render`   | View rendering functions (home grid, index sections, TOC)    |
| `sw`       | Service worker, offline, caching                             |
| `ci`       | Tooling, pre-commit, GitHub Actions, build pipeline          |
| `css`      | CSS-only changes not tied to a specific view                 |
| `js`       | JS-only changes spanning multiple modules                    |

`ux` is a Type, not a Component. `a11y` occasionally appears as a component in older tickets - acceptable in practice.

---

## RECOMMENDING TICKETS

When user asks which ticket to work on, do this:

1. Read `docs/tickets-backlog.md` and sort by priority then story points.
2. Present top 3–5 candidates with: ID, Summary, Type, Priority, Story Points, Description.
3. Ask user to confirm before starting implementation.

Never recommend a ticket from `tickets-archive.md` (Done/Dropped). Never start implementation without user confirmation.

---

## STARTING WORK ON A TICKET

Whenever the user asks to work on a ticket (any phrasing: "let's do WIKI-xxx", "work on tickets", "pick a ticket", "implement WIKI-xxx"):

Read `docs/tickets-backlog.md` to confirm the ticket exists with Status `Backlog` or `In Progress` before proceeding.

---

## COMPONENT → FILE MAPPING

| Component tag | Files to read                                                       |
| ------------- | ------------------------------------------------------------------- |
| `search`      | `js/search.js`, `js/state.js`                                       |
| `content`     | `js/content.js`, `js/render.js`                                     |
| `render`      | `js/render.js`                                                      |
| `nav`         | `js/app.js`, `js/state.js`                                          |
| `storage`     | `js/storage.js`                                                     |
| `settings`    | `js/storage.js`, `css/themes.css`, `css/tokens.css`                 |
| `ui`          | Relevant view CSS (`css/view-*.css`) + `css/components.css`         |
| `css`         | `css/tokens.css` first, then relevant view CSS                      |
| `js`          | Use module map in `CLAUDE.md`                                       |
| `sw`          | `wiki-sw.js` only - **cache version bump required on every change** |
| `a11y`        | Relevant JS module + `index.html`                                   |
| `ci`          | `.github/` directory                                                |

---

## STARTING IMPLEMENTATION

1. Read the ticket's Description and Remarks carefully - Remarks often contain implementation constraints.
2. Map Component tags to files using the table above.
3. Read only the mapped files - do not explore broadly.
4. Check if ticket references another ticket (e.g., "Extends WIKI-078", "Superseded by") - if so, read that ticket's Remarks first.
5. Follow `CLAUDE.md` skill routing for the ticket Type:
    - `bug` → `systematic-debugging` if root cause unknown; direct edit if cause is stated in Description
    - `feature` → no skill if spec is clear (it usually is in the ticket); `brainstorming` only if description is vague
    - `perf` / `a11y` / `ux` / `refactor` / `cleanup` / `dx` / `security` → direct edit, no skill

---

## ADDING NEW TICKETS

When user asks to add a ticket (or generating tickets in bulk, e.g. from an audit report):

1. **Duplicate check first** - before drafting a new ticket, search `tickets-backlog.md` AND `tickets-archive.md` for existing tickets covering the same bug/file/behavior. Search by file path mentioned, by the specific broken function/selector, and by summary keywords - not just by ticket title. A near-identical bug already ticketed (even worded differently, even from a different audit/source) means: extend the existing ticket's Description/Remarks if it adds detail, don't create a new row. This applies per-sub-finding when bundling multiple findings into one ticket, too - check each sub-finding individually, not just the bundle as a whole.
2. Use next sequential WIKI-xxx ID - check the highest existing ID in **both** `tickets-backlog.md` and `tickets-archive.md` (IDs are unique across both files).
3. Entry Date: today's date (ISO format).
4. Summary: ≤7 words, imperative phrasing ("Add X", "Fix Y", "Improve Z").
5. Description: ≤30 words - be specific enough to implement without asking.
6. Status: `Backlog`. Impl. Date: `-`. Remarks: empty unless there's a known constraint.
7. Story points: refer to `docs/_meta/decisions/story-points-estimation.md` for sizing.
8. Add as a new row in `tickets-backlog.md` - maintain column alignment.

If a duplicate slips through anyway and is caught later: never delete either row (see TICKET LIFECYCLE below) - drop the newer/redundant one to `tickets-archive.md` with Status `Dropped`, Remarks `Duplicate of WIKI-xxx`, and add a `Supersedes WIKI-xxx` note in the surviving ticket's Remarks.

---

## TICKET LIFECYCLE

- `Backlog` → `Done` or `Dropped`: when implementation is complete or the ticket is invalidated, **move the row** from `tickets-backlog.md` to `tickets-archive.md`, setting Impl. Date and brief Remarks (Dropped rows should explain why in Remarks, e.g. "Superseded by WIKI-xxx").
- Never delete rows - moving to the archive file preserves history.
- Never change an ID after creation.
