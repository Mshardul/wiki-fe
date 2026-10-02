# Sub-spec 5 exit checklist — `post-cutover.md` Part B

Part B (Phases 8–10) plus the Phase 11 confirmation. Recorded **2026-10-02**. Phases 8–10 remain uncommitted pending user review.

## Evidence against each spec §5 Sub-spec 5 exit criterion

| Criterion | Status | Evidence |
| --- | --- | --- |
| Docs match shipped code | ✅ | Phase 10: `CLAUDE.md`, `CONVENTIONS.md`, `readme.md`, root `CLAUDE.md` and the `fe-next-stack` memory describe the Next stack; read back once, no live vanilla-era claims. |
| CI green end to end | ◐ | Hosted CI [run 36907091637](https://github.com/Mshardul/wiki-fe/actions/runs/36907091637) on `c698ba4` — all jobs success incl. build, 3 e2e shards, deploy. That commit predates the uncommitted Phase 8–10 work (it still ran the old generator jobs), so the final CI form is unproven until those changes are pushed. Local toolchain + e2e verified green by the user. |
| `wiki-be` ticket resolved | ✅ | WIKI-BE-58 — Done 2026-10-02. Live preflight `OPTIONS /api/v1/auth/me` from `https://mshardul.github.io` → 200 with ACAO; no BE code change. |

## Part B phases

| Phase | Status | Notes |
| --- | --- | --- |
| 8 — retire Python generators + CI final form | ✅ | Four generators + `bump_cache_version.py` deleted; five CI jobs removed; `build` job diff-gates committed indexes. |
| 8b — `lib/content` build/read split | ⏸ Deferred | Own epic; needs an executable spec first ([`content-lib-split.md`](./content-lib-split.md)). Not blocking. |
| 9 — e2e full sweep + CI wiring | ✅ | Part A files sharded; highlight + notes e2e restored. `tests-heavy` job still absent (pre-existing). |
| 10 — docs rewrite | ✅ | See above. |

## Repo grep for retired stack (`Showdown`, `highlight.js`, `hljs`, `DOMPurify`, `wiki-sw.js`, `js/app.js`)

Zero live references. Stale `.hljs*` CSS (`code.css`, `print.css`), the diff-highlight e2e test + its fixture, the DOMPurify fail-closed e2e test and the "Showdown" docstring were removed 2026-10-02. Remaining non-doc hits: `wiki-sw.js` in `app/layout.tsx` + `eslint.config.js` (intentional legacy-SW unregister / ignore) and "Dropped:" comments in `tests/e2e/`.

## Live production check (`https://mshardul.github.io/wiki-fe`, 2026-10-02)

| Check | Status |
| --- | --- |
| `/`, `/system-design/`, `/dsa/`, article (`caching`), `/dashboard/`, `/changelog/`, `/admin/`, `/offline/` | ✅ 200, each with its own `<title>` |
| `/robots.txt` | ✅ `Disallow: /` |
| `/sw.js`, `/manifest.webmanifest` | ✅ 200, correct content types |
| Unknown route | ✅ 404 page |
| Offline: SW controls page; offline reload of a visited article + navigation to another route | ✅ (local `out/` build, chromium) |
| Local `wiki-be` (scratch DB), dummy user via API; login + `/auth/me` + hydrate GETs (bookmarks/completions/recents) from FE | ✅ |
| FE → BE sync **writes** (`POST` bookmarks/recents/completions) | ✅ fixed 2026-10-02 — BE requires `client_ts` (WIKI-BE-28); `lib/api.ts` now stamps it (`mutationRef`), Vitest-covered. Re-verified against local `wiki-be`: POST 201, row stored, local wipe + reload restores recents. Gap predated the migration (vanilla `js/api.js` never sent it). |
| Breadcrumb intermediate crumbs linked to non-existent folder routes (404) | ✅ fixed — only the vertical crumb links now. |

## Fixes found during the final gate (2026-10-02)

- `lib/api.ts` sync mutations missing `client_ts` (above).
- `Breadcrumb` linked intermediate folders (`/system-design/components/`) that have no page.
- `lib/content/pipeline.ts` typecheck error: `"text"` in `SHIKI_LANGS` is a Shiki special language, not a bundled one; removed from the list, `pipeline.test.ts` coverage guard treats it as built-in.
- `Modal` synced its open state in a passive effect, so a keypress right after the dialog rendered could still see no modal open (W opened the switcher over Bookmarks); now a layout effect.
- e2e hydration race: hotkeys bind after hydration but tests pressed keys on SSR content. `SettingsInit` sets `html[data-hotkeys-ready]`; `tests/conftest.py` waits on it after every in-app `page.goto`.
- `test_navigation` direction-signal tests raced the 300ms transient attribute; they now record it with a `MutationObserver`.
- Gate after fixes: `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test:all` ✅ 449 + 4 · `pnpm build` ✅ 184 routes · full e2e ✅ **376 passed / 188 skipped / 0 failed, 3 consecutive runs**.

## Open items

- Push Phase 8–10 + these fixes so hosted CI proves the final form.
- `/reads` endpoints exist on the BE but the FE has never synced reads (local-only); decide if that is wanted.
- Phase 8b epic and Playwright TS port epic (post-migration).
