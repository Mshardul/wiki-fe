# Wiki

A fast, offline-capable reference wiki for interview prep. Two verticals - **System Design** and **Data Structures & Algorithms** - share one app: Next.js (App Router) static export to GitHub Pages. Content is plain markdown; a build-time pipeline turns it into a searchable, linkable, themeable site with client islands for interactivity.

---

## Goals

Each vertical serves a specific dual purpose - every article is written against these:

| Vertical          | Purpose                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System Design** | **Interview** readiness **+ learning new tools** (understand a component/tool deeply enough to choose and use it).                                                         |
| **DSA**           | **Interview** readiness **+ competitive programming** (the theory, the working, the reasoning - plus the CP toolkit: prefix sums, constraints→approach, contest pitfalls). |

These goals drive the writer/rater params: the DSA params exist to make an article interview- **and** contest-ready, not merely complete.

---

## Verticals

| Vertical                         | Icon | Content root             | Status                  |
| -------------------------------- | ---- | ------------------------ | ----------------------- |
| **System Design**                | ⚙️   | `content/system-design/` | ~51 articles            |
| **Data Structures & Algorithms** | 🧩   | `content/dsa/`           | scaffolded, content WIP |

Each vertical is one entry in `lib/content/verticals.ts` - that registry drives discovery, home cards, index routes, and `generateStaticParams`. Adding a vertical is data, not a new app shell.

---

## Dev setup

```bash
# Node 24.x + pnpm 10.34.5 (see package.json engines / packageManager)
pnpm install          # app deps
make install          # .venv + Playwright Chromium + pre-commit (e2e)
```

---

## How to run

```bash
pnpm dev              # Next dev server (base path /wiki-fe/)
# or production-shaped:
pnpm build            # content:build + next build + Serwist → out/
# then serve out/ under /wiki-fe/ (e2e conftest does this)
```

Offline caching is Serwist (`app/sw.ts`) — precache hashes update on build; no manual cache-version bump.

---

## Architecture (brief)

Next.js App Router, TypeScript, static export to `out/` on GitHub Pages (`/wiki-fe/`).

- **Build-time content:** `lib/content/` (unified/remark/rehype + Shiki) renders markdown → HTML; `pnpm content:build` also emits committed `content/{search-index,backlinks,broken-links}.json`.
- **Routes:** real paths under `app/` — home, `[vertical]`, article `[...slug]`, dashboard, changelog, admin, offline.
- **Islands:** interactive behaviour is client components under `components/` (search, auth, highlights, Mermaid, …). Markup comes from the pipeline; islands never re-parse markdown.
- **Persistence:** `lib/storage/` → localStorage (+ optional sync via `wiki-be` through `lib/api.ts`).

`app/` routes · `lib/` content/api/storage/search · `components/` per-feature islands · `css/` tokens-first. Full file-by-file map: [CLAUDE.md](./CLAUDE.md) FILE MAP.

**Deeper detail for working on the code lives in [CLAUDE.md](./CLAUDE.md)** - file map, task→file routing, conventions.

---

## Adding content

Articles are markdown under a vertical's content root, listed in that vertical's `index.md`. Each vertical has its own writing instructions under `docs/_meta/ai-instructions/`:

| Vertical      | Instructions                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| System Design | `_base.md` (read first) + a type file: `components.md` · `algorithms.md` · `hld.md` · `devops-tools.md` · `devops-cheatsheets.md` (self-contained). |
| DSA           | `dsa-writer.md` (the rules - source of truth) + `dsa-rater.md` (scores a draft + ship/no-ship gate).                                                |

Format conventions shared by both verticals:

- Open `# Title` → `## Prerequisites` → `## Table of Contents` → body. **No YAML front matter** (the search index reads headings).
- Filenames: lowercase, hyphen-separated, `.md`.
- Then add the article to the vertical's `index.md` table so the app discovers it.

---

## System Design

The original vertical. Articles split across `components/`, `algorithms/`, `distributed-systems/`, and `hld/` (high-level designs). Writing rules: `docs/_meta/ai-instructions/sd-writer.md`. Rating / publish-gate: `docs/_meta/ai-instructions/sd-rater.md`.

---

## DSA

DS and algorithms are intertwined, so they live in **one combined vertical**, not two. Three sections under `content/dsa/`:

- `data-structures/` - structural references.
- `algorithms/` - procedure + correctness.
- `patterns/` - recognition + transfer (the interview-prep heart: "problem says X → reach for pattern Y").

**Writing a DSA article:**

1. Copy the matching skeleton from `content/dsa/_templates/` (`ds.md` · `algorithm.md` · `pattern.md`) to the target path. These are never indexed by the app.
2. Fill it per `docs/_meta/ai-instructions/dsa-writer.md` - the source of truth for what every section must contain (params, families, the pseudocode-≠-Python rule, recognition signals).
3. Self-rate with `dsa-rater.md` until it reads **SHIP**; run `scripts/dsa-check.sh <article.md>` for the deterministic link/filename checks.

**What sets DSA apart from System Design:** every article carries an interview spine - explicit complexity, a clean pseudocode + idiomatic Python pair, and a spoken "soundbite". Pattern articles add **recognition signals** (literal trigger phrases → which pattern) that the rest of the vertical cross-links into.

**Backlog (high level):** P0 = 21 foundation articles (8 DS, 7 algorithms, 6 patterns) everything else links back to; P1 builds on P0 (graphs, advanced patterns); the pattern-selection cheat sheet ships **last** since it aggregates every pattern's trigger phrases. Build order: DS → algorithms → patterns, in dependency order.

---

## Periodic maintenance

Files that don't update themselves - review/update these on a recurring basis, not just when a ticket touches them:

| File                                                                                 | Update when                                                                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `docs/_meta/audit-prompts/auth-ux-audit-agent-prompt.md`                              | Auth flow/UI changes meaningfully - keep journey checklist matching real steps                    |
| `docs/_meta/audit-prompts/mobile-ux-audit-agent-prompt.md`                            | New page/component added, or viewport/breakpoint strategy changes                                 |
| `docs/_meta/audit-prompts/ui-components-audit-agent-prompt.md`                        | New island/component added/removed - update component roster; known interaction points list needs manual review as new components are added |
| `docs/_meta/audit-prompts/codebase-quality-audit-agent-prompt.md`                     | Rare - only if module layout or shared-helper conventions change structurally                      |
| `docs/_meta/audit-prompts/security-audit-agent-prompt.md`                             | New innerHTML/localStorage/postMessage/SW-cache code path added, or Semgrep rule packs change        |
| `CLAUDE.md` FILE MAP                                                                   | New `js/` file added/removed - run `find js -name '*.js'` and diff against the FILE MAP subtables    |

Run audits periodically (no fixed cadence yet - ad hoc). Each run's output is a **new dated file** under `docs/_meta/audit-reports/` (`{name} - YYYYMMDD.md`) - never overwrite a prior run's file.
