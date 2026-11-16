# Wiki App - Claude Instructions

**Coding standards live in [CONVENTIONS.md](./CONVENTIONS.md) - read it before writing or changing code.** This file is operational: how to classify a task, what to read first, what to do when done.

## Project facts

- Static export on GitHub Pages (`next build` → `out/`), no server runtime. Base path `/wiki-fe/`.
- Next.js App Router + TypeScript + pnpm. Markdown goes through a remark/rehype pipeline at build time (`lib/content/`); components are islands that add behaviour and never re-parse markdown.
- Backend `wiki-be` is reached only through `lib/api.ts`. All `localStorage` goes through `lib/storage/`.
- CI gates: `pnpm typecheck`, `pnpm lint`, `pnpm test:all`. E2e: `pnpm build:e2e` then `pnpm test:e2e` (adds canary pages).
- **SEO / discoverability is not a project goal** (personal tool; `robots` Disallow). Never optimise content or tickets for search engines.

## Session start

Classify the task, then read only what the type needs:

| Signal | Type | Read first |
| --- | --- | --- |
| `WIKI-xxx` / "work on tickets" / "pick a ticket" | Ticket | `docs/tickets-backlog.md` (active only; history is in `docs/tickets-archive.md`), schema in `docs/_meta/ai-instructions/tickets.md` |
| `DSA-xxx` / `SD-xxx` / "content backlog" | Content backlog (not app tickets, never `WIKI-xxx`) | `docs/_meta/ai-instructions/content-backlog.md`, then `docs/content-backlog.md` |
| "add content" / "write article" / topic name | Content | `docs/_meta/ai-instructions/*-writer*.md`, then the `.md` under `content/` |
| Any Visualizer work | Visualizer | `docs/_meta/visualizer/README.md`, then the spec it links |
| CSS / theme | CSS | `css/tokens.css` first |
| Named file or component | Direct | that file |

Do not read `content/**/*.md` for app work, or `app/` / `components/` / `lib/` / `css/` for content work. Do not read whole domain folders; use targeted reads.

## Skills

- Real bug, unknown cause → `systematic-debugging`. Hard or perf bug → `diagnose`.
- Vague feature → `brainstorming` (scope only). Clear spec → no skill (`executing-plans` if multi-step).
- Commit → `caveman-commit`. Diff review → `caveman-review`. PR review → `code-review`.
- 2+ independent subtasks with zero shared state → `dispatching-parallel-agents`.
- Architectural refactor → `improve-codebase-architecture`. Branch wrap-up → `finishing-a-development-branch`.
- Skip `verification-before-completion` for single-file, CSS-only and content `.md` changes.
- **Never here:** `frontend-design` (fixed aesthetic), the TDD skill ritual (Vitest tests are still required, see CONVENTIONS Testing), `playground`, `netlify-skills`, `subagent-driven-development`, and meta/setup skills unless asked.

## Architecture rules

- Never put a visualizer's domain words or rules in generic visualizer code (`components/visualizer/**`, `lib/visualizer/core/**`). Domain logic and the model adapter live in `lib/visualizer/<name>/`.
- Service worker cache versioning is Serwist-hashed. No manual bump.

## Completion checklist

After any coding task:

1. **Tests**: new behaviour needs coverage. Vitest for `lib/` and islands; e2e only when the interaction needs a browser. May run the specific new or changed test; never the full e2e suite unprompted.
2. **Ticket closure**: if `WIKI-xxx`, move the row from `docs/tickets-backlog.md` to `docs/tickets-archive.md` (Status `Done`, Impl. Date today).
3. **Content-backlog closure**: if `DSA-xxx` / `SD-xxx`, move to `docs/content-archive.md`. Never into tickets-archive.

After any content task:

4. **Content changelog**: update `content/CHANGELOG.md` under today's date (skip typo-only changes).
5. **Generated JSON**: `pnpm build` or `pnpm content:build` regenerates `content/{search-index,backlinks,broken-links}.json`. Commit them with the content change; CI diffs them.
6. `content/bridges.json` is hand-authored and validated inside `buildContent()`.

## Non-negotiables

- Never `git add` / `commit` / `push` unless explicitly asked. Never add `Co-Authored-By`.
- Never put WIKI-xxx / DSA-xxx / SD-xxx IDs in code comments or CSS section headers.
- No `console.*` in committed code. Content filenames: lowercase, hyphen-separated, `.md`.
- Never hard-wrap prose in Markdown files (one line per paragraph or list item). Manual breaks only in code fences, tables, and where Markdown requires them.
- Plan/spec/audit/instructions/decision docs under `docs/_meta/` or `docs/superpowers/` need the front-matter header (`role`, `created`, `last_updated`, `status`), with `last_updated` set to today on every edit (CONVENTIONS Doc headers).
