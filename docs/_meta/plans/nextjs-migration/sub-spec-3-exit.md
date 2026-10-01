# Sub-spec 3 exit checklist — `cutover.md`

Cutover shipped 2026-09-30 (`8261c57`, CI fixes `0965150`). The vanilla app is deleted, and the Next.js static export is live at `https://mshardul.github.io/wiki-fe/`, deployed by the CI `deploy` job (Pages source = GitHub Actions). CI is fully green on `96da42c`. One item stays open: logged-in sync against the live `wiki-be` (deferred by the user).

## Evidence against each spec §5 Sub-spec 3 exit criterion

| Criterion | Status | Evidence |
| --- | --- | --- |
| Cutover-critical checklist green | ✅ | `cutover.md` Phase 14 Step 1 walks every "In scope" row: reader islands, home + index, routing, search, auth UI + `lib/api.ts` + synced domains, settings, per-article local, mobile, chrome, PWA. Each row cites e2e/vitest coverage, plus live smokes for the rows without passing e2e (reader smoke 21/21, gap smoke 5/5). Features with no corpus usage (collapsible callouts, tabbed code, footnotes, caveats, `viz`, video embed, display LaTeX) are covered by plugin fixture tests and island vitest only. |
| Python e2e subset (shipped features) passes against the Next build | ✅ | **CI run `36816073827` on `96da42c`, all jobs green: 325 passed / 201 skipped / 0 failed** (shards 111/27, 103/27, 111/147), on the runner's Chrome. History: | Locally against `out/`: Phase 13 324 passed / 207 skipped, Phase 14 323 / 201, 0 failed. CI on `8261c57`: shards 1 + 3 green; shard 2 hung in `playwright install --with-deps` and was cancelled, then run locally: 103 passed / 27 skipped / 0 failed. CI on `0965150`: all three shards errored at setup, because `--video` needs Playwright's `ffmpeg`, which went away with the Chromium install step, so no test ran. Video recording was then removed from CI. Mock-infra tests are skip-marked with the e2e-modernization reason; the epic is filed as WIKI-645–650. |
| Static export deploys to Pages at the subpath (first real deploy), every route loads | ✅ | `deploy` job green on `8261c57` and `0965150`. Live sweep (`live_verify.py`): all 176 `out/**/index.html` routes return 200 with the built `<title>`. |
| Offline verified | ✅ | Live, same browser profile relaunched with the origin unresolvable: home loads from precache, the saved article renders, and an uncached article falls back to the offline shelf, which lists the saved article. |
| Each page has a correct `<title>` | ✅ | Live sweep matches every route's built title. Client-side navigation (home → vertical → article) titles correct. The offline fallback reads "Offline shelf · Wiki", after removing `Breadcrumb`'s pathname-derived `document.title` (route metadata owns titles). Two shared titles are expected: `404/` = `_not-found/`, and the two `backtracking` articles in different sections. |
| `robots.txt` disallows all | ✅ | Live: `User-Agent: *` / `Disallow: /`. No SEO metric gated (§14). |
| Old service worker cleanly replaced | ✅ | `swRegister` in `app/layout.tsx` unregisters any `/wiki-sw.js` registration, then registers `sw.js` (same `/wiki-fe/` scope). Returning-visitor simulation (vanilla snapshot → `out/` on the same origin): after reload 1 and reload 2, `sw.js` is the only registration and the controller, and Next markup renders. Live: `sw.js` controls `/wiki-fe/`, `wiki-sw.js` returns 404. |
| Vanilla app deleted in the same commit range | ✅ | `8261c57` deletes `index.html`, `js/**` (62 files), `wiki-sw.js`, root `404.html`, plus the vanilla `manifest.json`, `icon.svg`, `icons/` (duplicated in `public/`) and `scripts/bump_cache_version.py`. Zero live imports of `js/` (Phase 14 Step 3). |
| `wiki-be` CORS; auth + sync against live `wiki-be` | ◐ | CORS ✅: from the live origin, `/health` 200, `/api/v1/auth/me` returns a readable 401 and `/api/v1/auth/login` a readable 422, so preflight with `X-Request-Id` + `Authorization` passes. That confirms prod `FRONTEND_URL`. Logged-in sync ❌ **not verified: deferred by the user** (needs a real account). |

## Knowingly absent (ships in `post-cutover.md`)

Accepted tradeoff (spec §5): the live site runs without these until `post-cutover.md` Part A lands.

- Dashboard view
- Admin view
- Changelog view
- Highlights + inline markers
- Notes scratchpad
- Complexity comparator

Also not ported, tracked as tickets: resume-by-idea chip (WIKI-651), collapsible TOC sections (WIKI-652), scroll-key eviction (WIKI-653), long-press peek (WIKI-657). Dropped outright (spec §9 / user decisions): quiz-me, graph overlays, parallax, study mode + feedback, debug overlay, freeze-frame.

## Deviations from the plan (plan doc updated in place)

| Area | Plan said | Actual | Why |
| --- | --- | --- | --- |
| Step order | Step 9 (SW shim) after deploy | Before Steps 7–8 | A shim added after the first deploy never reaches the returning visitors it exists for. |
| `biome.json` | Remove `js/**` from `ignore` | No change | Biome 2.x uses an `includes` allow-list; `js/**` was never in it. |
| `deploy` job | Runs on every `build` | Push to `main` only, adds `contents: read` | PRs build and test only. |
| `tests-heavy` | Point at swept suite | Removed | No test is marked `heavy` after the sweep. |
| e2e browser in CI | `playwright install --with-deps chromium` | Runner's preinstalled Chrome (`--browser-channel chrome`), job `timeout-minutes: 20` | The apt step hung a shard. |
| e2e failure artifacts | screenshot + video + trace | screenshot + trace | Video is not wanted (user decision); traces already hold DOM snapshots, screenshots and network. |
| CI pre-commit | Ran `pnpm typecheck/lint/test` | Removed from `.pre-commit-config.ci.yaml` | The `frontend` job runs them; the hooks runner has no Node. |
| Article HTML | — | `nosemgrep` on `dangerouslySetInnerHTML` | Build-time output of git-authored markdown, no user input. A runtime sanitiser is WIKI-659. |
| `document.title` | Breadcrumb-derived on the client | Route metadata only | The pathname-derived title mislabelled the SW offline fallback. |

## Open follow-ups

- **Logged-in sync:** verify against the live `wiki-be` (user, manual).
- **`wiki-be` email links:** `wiki-be/app/comms/email.py` builds verify/reset/welcome links as `{FRONTEND_URL}/?mode=…`. CORS needs `FRONTEND_URL` to be the bare origin, so those links land on the github.io root (404), not `/wiki-fe/`. Pre-existing; for wiki-be to decide.

## Local check (2026-10-01)

`pnpm typecheck` ✅ (main + sw) · `pnpm lint` ✅ · `pnpm test` ✅ 404/404 (98 files) · `pnpm build` ✅ (176 pages; SW precaches 91 URLs / 2.67 MB) · CI pre-commit config run locally ✅.
