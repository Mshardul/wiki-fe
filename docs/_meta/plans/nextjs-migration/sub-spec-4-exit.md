# Sub-spec 4 exit checklist — `post-cutover.md` Part A

Part A (Phases 1–6) ports the six features deferred from cutover onto the live Next app. Exit recorded **2026-10-01**. Phases 1–6 remain uncommitted pending user review.

## Evidence against each spec §5 Sub-spec 4 exit criterion

| Criterion | Status | Evidence |
| --- | --- | --- |
| Every Phase-4 row in §9 shipped | ✅ | See itemised table below. |
| Full Python e2e suite passes against the Next build | ✅ | Local: **365 passed / 201 skipped / 0 failed** (`PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright .venv/bin/python3 -m pytest tests/e2e/ -q`, ~4m33s). Skips = e2e-modernization mock-article epic (WIKI-645–650) + 12 highlight/marker e2e still deferred to Phase 9 fixture rewrite + dropped `test_section_map.py` (spec §9 graphs). |

## Phase-4 feature rows (§9)

| Feature | Status | Code | e2e |
| --- | --- | --- | --- |
| Highlights + inline emoji markers | ✅ | `components/reader/Highlights.tsx`, `lib/storage/highlights.ts`, `lib/reader/text-offsets.ts`; mounted in `ReaderIslands` | ◐ 12 tests still skip-marked — fixture rewrite is Phase 9 Step 6 (reason retagged 2026-10-01). Vitest covers island + storage. |
| Notes scratchpad | ✅ | `components/reader/NotesScratchpad.tsx`, `lib/storage/notes.ts`; per-article `key` + `pagehide` flush | ✅ `test_notes_scratchpad.py` **8/8** (restored early in Phase 7; was planned for Phase 9 Step 7) |
| Complexity-comparator modal | ✅ | `components/reader/ComplexityCompare.tsx`, `lib/reader/complexity-matrix.ts` | ✅ `test_complexity_comparator.py` **8/8** |
| Changelog view | ✅ | `app/changelog/page.tsx`, `lib/content/changelog.ts` | ✅ `test_changelog.py` **8/8** |
| Progress dashboard | ✅ | `app/dashboard/**`, `lib/dashboard/progress.ts` | ✅ `test_dashboard.py` **7/7** |
| Admin view | ✅ | `app/admin/page.tsx`, `components/admin/*`, `lib/admin/reports.ts` (Users + Site Health; client role gate) | ✅ `test_admin.py` **7/7** |

## Local toolchain (2026-10-01)

`pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ **458/458** (111 files) · `pnpm build` ✅ (184 routes; SW precaches 91 URLs / 2.67 MB) · full e2e ✅ **365 passed / 201 skipped**.

## Deviations / rulings

| Area | Plan said | Actual | Why |
| --- | --- | --- | --- |
| Notes e2e | Phase 9 Step 7 | Restored in Phase 7 | Hash-URL fixture blocked the full-suite exit gate; rewrite uses real routes (`system-design/components/caching`). |
| Notes flush on hard nav | Unmount-only flush | + `pagehide` listener; remount `key` on article path | `page.goto` hard-nav does not run React unmount cleanup; without `pagehide`, fast-nav e2e lost pending saves. |
| `test_section_map.py` | Deferred with graphs | Module skip (`dropped feature — section-map / graph overlays`) | Spec §9 drop; file was still live and produced 8 ERRORS on the first full-suite run. |
| Highlight e2e skip reason | `"not yet ported"` | Retagged to Phase 9 fixture-rewrite reason | Feature is ported; only the shared `_load_mock_article` fixture is missing. |
| Admin page shape | Client page only | Server page bakes reports; client `AdminView` gates + tabs | Static export can bake public build data; role gate stays client-side. |

## Open follow-ups (Part B / later)

- **CI shards** still omit `test_{dashboard,admin,changelog,notes_scratchpad,complexity_comparator}.py` — add in Phase 9 when confirming shard balance (`.github/workflows/ci.yml` comment already notes this).
- **Highlight/marker e2e** — Phase 9 Step 6 after mock-article fixture rewrite.
- **Visual checks** pending for several Part A islands (not blocking exit).
- **Logged-in sync** against live `wiki-be` — still open from Sub-spec 3.
- Part B (Sub-spec 5) starts at Phase 8 — retire Python generators, content-lib split, e2e sweep, docs rewrite.
