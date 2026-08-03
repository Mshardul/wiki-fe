# E2E CI Resource Hardening - Plan

One-time plan from the 2026-08-03 discussion on CI e2e failures (`pytest tests/ -q -n auto`, 11/773 fails, 7 xdist worker crashes: "node down: Not properly terminated"). Goal: stop resource-starvation-driven crashes and cut wall-clock, without weakening test isolation. This doc is the decisions reached; execution happens as separate work (tickets/PRs), not inline here.

## Starting facts (verified, not assumed)

- Repo is **private** - 2000 free CI min/month, **5 concurrent jobs max**, standard `ubuntu-latest` runner = **2 vCPU / 7GB RAM** (corrected 2026-08-03 - originally assumed 4 vCPU, verified wrong via web search). This makes the crash math tighter than first estimated: `-n auto`/any worker count above ~2 is already oversubscribing before chromium memory pressure is even factored in, and the local HTTP test server's thread pool also competes for those same 2 cores.
- Current CI wall-clock: **7m20s (438s)**, dominated entirely by the `tests` job - the other 8 jobs in `.github/workflows/ci.yml` (`hooks`, `search-index`, `backlinks`, `broken-links`, `cache-version`, `dead-links`, `bridges`, `semgrep`) are all fast (~10-90s each, no browser) and finish well before `tests` does. They are not the bottleneck and don't need consolidation.
- `tests/conftest.py` has **no fixture leak**. `browser`/`context`/`page` are pytest-playwright's defaults (`browser` = session-scoped per xdist worker, `context`/`page` = function-scoped) - conftest.py never overrides `browser` scope, only `browser_context_args` (adds `service_workers: "block"`). One chromium process per worker is already reused across that worker's tests; there is no "relaunch browser per test" waste to cut.
- Root cause of "node down: Not properly terminated" crashes: **too many concurrent chromium processes for the runner's real resources** (`-n auto` worker count vs 2 vCPU + 7GB RAM, worst on canvas/PNG-export/highlight-toolbar tests in `test_content_enhancements.py`, which are heaviest per-process).
- `--disable-dev-shm-usage` is **already Playwright's own default launch arg** (confirmed in `playwright/driver/package/lib/coreBundle.js`) - not a gap in this codebase, no action needed here.
- State-leakage audit of `test_content_enhancements.py` (highlight/marker/toolbar/PNG tests): clean. No lingering timers, no shared mutable state, no filesystem writes, unique `slug`-namespaced localStorage keys per test. Browser-process reuse across tests (with fresh `context` per test, as already happens) is safe.
- `WIKI-520` filed for a real, unrelated bug found during this investigation (mark-read-by-section dot flashes then disappears) - **not fixed as part of this initiative**, tackled later per its own ticket.
- Two of the original 11 CI failures (`hover-preview` timeouts) are confirmed **load artifacts** correlated with the same resource-starvation root cause (400ms debounce timer delayed under CPU-starved parallel run) - not independent bugs.
- `pytest.ini` already registers a `slow` marker (tests with network waits/timers/reloads) alongside `smoke` - the plan's new `heavy` marker is a distinct concept (resource cost, not just wall-clock) and should coexist with `slow`, not replace or duplicate it.

## Decisions

### 1. Sharding
**Implemented 2026-08-03 (later same day, after #2's first real-CI run showed `tests-light` at `-n 2` un-sharded still crashing - see Starting facts addendum below).** File-based, **3 shards** for the `tests-light` job (not duration-based `pytest-split` for now - avoids a new maintenance artifact; revisit only if manual balance drifts, which the recurring audit will check). Each shard is its own `matrix` entry/job in `.github/workflows/ci.yml`, **`-n 2`** internally per shard (real vCPU count on the private-repo standard runner - see corrected spec above; not max−1 headroom as first estimated, since there's no headroom to spare at only 2 cores total).

Hand-balanced by test count (greedy bin-pack, largest file first) across all 33 non-heavy test files: shard-1 258 tests, shard-2 255, shard-3 258 (768 total, matches `pytest tests/ -m "not heavy" --collect-only` exactly - verified locally, no overlap/gaps). `test_content_enhancements.py` (155 tests, the largest file and the one most implicated in the crash logs) sits alone in shard-1, still 103 tests short of a full shard on its own - accepted as-is per the plan's own reasoning that crashes are a *concurrent-chromium-count* problem, not a specific-file problem, so isolating that one file further wasn't judged necessary. **Not yet verified on real CI** - local `--collect-only` only so far.

### 2. Lane A / Lane B split
**Revised 2026-08-03 after a critical re-verification pass caught a sizing error in the original rule (see below).**

Original rule (canvas/PNG/download OR any `wait_for_timeout`/fixed sleep OR large DOM ops) was checked against the actual test files before implementation and found wrong: `wait_for_timeout` alone appears in **41 test functions across 16 files** (not concentrated in `test_content_enhancements.py`), because most of those are short UI-settle waits (~100-300ms), not resource-heavy operations. Folding "has any fixed wait" into "heavy" would have put ~41+ tests spread across 16 files into Lane B, breaking both the file-based sharding (Decision #1 - heavy tests would bleed across all 3 shards) and the "Lane B is small, serial `-n 1` is fine" framing (Decision #3).

Corrected mechanical rule, AST-verified against actual test bodies (not line-proximity grep) on 2026-08-03 - a test is **Lane B** only if it does canvas/PNG rasterization or file download (`page.expect_download()`, canvas assertions). Confirmed exactly **5 tests, across 3 files**:
- `test_content_enhancements.py:3210 test_save_as_card_triggers_png_download`
- `test_content_enhancements.py:3226 test_save_as_card_does_not_create_highlight_or_marker`
- `test_data_backup.py:22 test_export_button_triggers_download`
- `test_data_backup.py:36 test_export_json_contains_expected_keys`
- `test_html_markup.py:161 test_data_action_settings_export_works`

"Large DOM ops (bulk content load, big index render)" - dropped from the rule. Grepped for bulk-load/large-index patterns and found nothing concrete in the current suite; keeping a criterion that matches zero real tests is a vague, unenforceable rule waiting to bit-rot, not a real Lane B signal. Re-add only if a future audit finds an actual test that needs it, with the specific test named.

Fixed-wait/`wait_for_timeout` tests are **not** automatically Lane B - they're a separate, pre-existing concern already covered by the `slow` marker already registered in `pytest.ini` (not a new concept this plan needs to introduce). A test can be both `slow` and `heavy` if it independently meets the Lane B criteria above, but `slow` alone doesn't imply `heavy`.

Everything else is **Lane A**. Enforce via an explicit `@pytest.mark.heavy` marker (not an inferred file list) so CI config and the recurring audit can both check it mechanically (`-m "not heavy"` / `-m heavy`).

### 3. Lane B scheduling
**Implemented 2026-08-03.** Confirmed 5 heavy tests exactly (see Decision #2), across `test_content_enhancements.py`, `test_data_backup.py`, `test_html_markup.py`:
- Run Lane B as its own CI job (`tests-heavy`), separate from Lane A (`tests-light`), each getting a full runner allocation with zero internal lane contention. Easier failure triage as a side benefit (job name tells you which lane crashed). `tests-light` runs `-m "not heavy"` at `-n 2`, `tests-heavy` runs `-m heavy` at `-n 1`.
- `xdist_group` pinning **dropped as redundant** - with only 5 heavy tests and `-n 1` (serial, one worker), there's nothing to pin against; the whole point of `xdist_group` is preventing multiple *workers* from running heavy tests concurrently, which a single-worker job already guarantees by construction.

### 4. B2 test sequencing (chaining, not fixture change) - **`test_content_enhancements.py` DONE 2026-08-03; rest of suite audited 2026-08-03, not yet implemented**
Confirmed feasible - the earlier idea of a mixed-scope "session browser for some tests" fixture change is **dropped**: it's already the status quo (see Starting facts), so there's nothing to build there. Instead, chain tests that redundantly reconstruct near-identical setup into one ordered sequence (single test function, or explicit order within one file) since pytest's default execution order is stable and no new plugin is required for simple in-file chaining. Tradeoff accepted knowingly: chaining trades some failure-diagnosis clarity (a failed step 3 doesn't immediately tell you if step 1's state was already wrong) for cut redundant setup cost. Acceptable only where the sequence is a natural user journey anyway (create -> persist -> remove *is* a real flow), never as artificial optimization forced onto independent tests.

**`test_content_enhancements.py` (implemented, DONE):** four groups merged, 9 tests -> 4 functions - highlight lifecycle (create -> remove-via-popover -> keyboard-remove), marker lifecycle (create -> remove-via-popover), highlight reanchor/drop (upstream-edit-shifts-offset -> upstream-edit-removes-snippet), save-as-card presence (button-visible -> has-aria-label). The two `@pytest.mark.heavy` save-as-card download tests were deliberately left unmerged with the light ones - chaining a light test into a heavy one would pull it into the serial `tests-heavy` lane, fighting Decision #3's isolation goal.

**Rest of the suite (audited, NOT YET implemented):** same method (AST-grouped by shared setup-helper call, then read every 2+ group for genuine create->verify->modify->verify shape vs. independent/parametrized) run across the other 32 files in `tests/e2e/` (616 tests). Result: **17 of 32 files (53%) have zero genuine candidates** - most of the suite is already correctly isolated (option matrices in `test_settings.py`, distinct auth/route scenarios in `test_auth.py`, deliberately-separate close-mechanism tests in `test_navigation_polish.py`/`test_section_map.py`/`test_complexity_comparator.py`). Where chains do exist: **17 groups, 47 tests -> 17 functions (net -30)**, concentrated in lifecycle-shaped features (mark/unmark, create/remove, error/retry, collapse/expand):

| File | Tests -> functions | Group(s) |
|---|---|---|
| `test_read_toggle.py` | 11 -> 2 | initial-state checks (3->1); mark/unmark lifecycle (8->1) |
| `test_bookmarks.py` | 5 -> 1 | bookmark -> index -> modal -> remove journey |
| `test_content.py` | 4 -> 1 | footnote render assertions (same static fixture, 4 facts) |
| `test_index_ux.py` | 4 -> 1 | section collapse/expand/persist/restore |
| `test_recents.py` | 3 -> 1 | visit -> appear -> clear |
| `test_offline_shelf.py` | 4 -> 1 | seed -> evict lifecycle |
| `test_scroll_toc.py` | 2 -> 1 | resume-chip shows -> click-scrolls |
| `test_toc_overhaul.py` | 3 -> 1 | heading-collapse button: exists -> click -> persists on reload |
| `test_changelog.py` | 2 -> 1 | filter narrows -> filter cleared |
| `test_line_numbers_pathing_help.py` | 2 -> 1 | clear-recents undo toast -> undo restores |
| `test_html_markup.py` | 2 -> 1 | settings open -> close |
| `test_home.py` | 2 -> 1 | pin -> unpin |
| `test_notes_scratchpad.py` | 3 -> 1 | save -> clear / save -> revisit |
| `test_ux_hotkeys_errors.py` | 5 -> 2 | distraction-free chrome toggle (3->1); Escape dismiss-then-confirm (2->1) |
| `test_search.py` | 5 -> 2 | result-count badge lifecycle (3->1); load-failure/retry (2->1) |

Each group's specific test-function names, line ranges, and the reasoning for what was excluded from each file (parametrized variants that matter, mutually-exclusive close/dismiss mechanisms, fixture-content differences) were captured during the audit but not reproduced here - re-run the same audit method against current file state before implementing, since exact line numbers will have drifted. `test_admin.py` was reconsidered and correctly excluded despite looking chainable on the surface - its two candidate tests stub materially different API response bodies (2-user vs 1-user list) because the promote test needs a specific target row, which is fixture content that matters to test identity, not incidental duplication.

**Honest scale read:** chaining is a real but narrow lever, not a broad rewrite - just over half the suite has zero candidates, and the remaining reduction (30 functions across 32 files) is smaller than what one already-done file achieved on its own (9->4 out of 155 tests), because `test_content_enhancements.py` happens to have the deepest concentration of exactly the lifecycle shape this technique targets. Combined total once both are implemented: -35 test functions suite-wide (-5 done, -30 pending) - a real but modest wall-clock trim, not the fix for the crash/timeout issues Decisions #1/#3 and lever #6 target.

### 5. Additional structural levers (all verified against the codebase, not assumed) - in priority order for execution

1. **DONE 2026-08-03** - Cache the Playwright browser binary install step in CI (`.github/workflows/ci.yml`: `Cache Playwright browsers` step added, keyed on `hashFiles('requirements-dev.txt')`, path `~/.cache/ms-playwright`, ahead of the `Install Chromium` step in both `tests-light` and `tests-heavy`).
2. **DONE 2026-08-03** - Split `tests` into `tests-light`/`tests-heavy` CI jobs. `pytest.ini` got a new `heavy` marker; applied to the 5 confirmed canvas/PNG/download tests (`test_content_enhancements.py::test_save_as_card_triggers_png_download`, `::test_save_as_card_does_not_create_highlight_or_marker`, `test_data_backup.py::test_export_button_triggers_download`, `::test_export_json_contains_expected_keys`, `test_html_markup.py::test_data_action_settings_export_works` - needed adding `import pytest` to `test_data_backup.py` and `test_html_markup.py`, neither had it before). `ci.yml`'s `tests` job replaced with `tests-light` (`-m "not heavy"`, `-n 2`) and `tests-heavy` (`-m heavy`, `-n 1`). Verified via local `pytest --collect-only`: 768 + 5 = 773, exact partition, no overlap/gaps. **Not yet verified on real CI** - only local collection-level verification so far, no actual GitHub Actions run yet.
3. ~~`xdist_group` worker pinning for Lane B~~ - **dropped as redundant during implementation** (see Decision #3 above): with only 5 heavy tests at `-n 1` (single worker, serial), there's nothing to pin against.
4. **Trim PNG-export test resource footprint** - checked 2026-08-03: `test_save_as_card_triggers_png_download` (`tests/e2e/test_content_enhancements.py:3210`) does not assert on pixel content at all - it only checks `download.suggested_filename.endswith(".png")` and that the toolbar remains visible/usable after export. The "issue" is that reaching that assertion still requires the full real export pipeline to run (real canvas rasterization via `page.expect_download()` + the actual click), since Playwright can't fake the download event without the app doing real work - there's no way to stub canvas-to-blob from the test side without also changing the app code being tested, which is out of scope. Net: **not a real lever after all** - the test is already about as light as it can be given what it's verifying; the memory cost is inherent to the feature being exercised, not test-code waste. Demoted from the plan; the fix for this test's cost is scheduling (Lane B isolation, already done in #2), not trimming the test itself.
5. **NOT STARTED** - Scoped crash-only retry (`pytest-rerunfailures`, absent from `requirements-dev.txt`) as a safety net under the structural fixes, not instead of them - must be scoped to worker-crash-type failures only, never blanket-retry assertion failures, so it can't mask a real bug like WIKI-520. Lowest priority - only add once 1-2 are proven on real CI and still leaving occasional crashes; adding it first would risk masking whether the structural fixes actually worked.
- `--disable-dev-shm-usage` - **dropped**, already Playwright's default (see Starting facts). Briefly re-added to `tests/conftest.py` (`browser_type_launch_args` override) during a later same-day investigation into the still-crashing `tests-heavy` lane, before this plan doc was re-checked and the redundancy rediscovered - reverted, no net change.
6. **DONE 2026-08-03 (same later session as #1)** - Bumped `@pytest.mark.timeout(60)` on the two `tests-heavy` download tests (`test_save_as_card_triggers_png_download`, `test_save_as_card_does_not_create_highlight_or_marker`), up from the global `pytest.ini` `timeout = 30`. Root cause traced via `pytest-timeout` + `pytest-xdist` docs: `timeout_method = thread` (already correctly set here, since `signal` doesn't work under xdist workers) has a documented failure mode where a mid-test thread-timeout can leave the browser IPC connection in a broken state instead of failing cleanly, crashing the whole xdist worker rather than just that test - matches the exact "worker crashed while running X" symptom seen on both `tests-heavy` tests, both of which block on `page.expect_download()`. **Not yet verified on real CI.**

## Starting facts addendum (2026-08-03, later same day)

Two real CI runs (not local) surfaced after the facts above were first written:
- `tests-heavy` (`-m heavy`, `-n 1`): both download tests crashed their worker, consistently, across two separate runs. Lever #6 above (timeout bump) targets this.
- `tests-light` (`-m "not heavy"`, `-n 2`, **pre-sharding**): 15/762 failed in one run, 12 of them worker crashes scattered across `test_content_enhancements.py` (mostly), plus 3 real-looking non-crash failures (`test_mermaid_tooltip_shows_on_touchstart`, `test_404_fallback_on_bad_article`, `test_broken_slug_shows_toast`, `test_prerequisite_chip_*`) that traced back to being load-artifact side effects of the concurrent crashes (confirmed via reading the actual redirect/toast code in `js/render/router.js` - it's synchronous, no real race, so CPU-starved scheduling under crash chaos is the more likely explanation than an app bug). A session-scoped-browser "leak" theory was raised and investigated (JS listeners, manual `browser.new_context()` calls, CDN-mock fixture scope) and **ruled out** - no code-level leak found; this doc's own "no fixture leak" finding (Starting facts, item 3) held up under a second, independent re-check. Root cause remains what this doc already said: too many concurrent chromium processes for 2 vCPU/7GB, i.e. exactly what Decision #1 (sharding) targets - confirms Decision #1 was the right next lever, not a fixture change.

**Overall status (2026-08-03, end of day): levers #1, #2 implemented, ran on real CI (still crashing pre-sharding, as expected pre-Decision-#1). Decision #1 (3-shard split) and lever #6 (timeout bump) implemented and locally verified, not yet run on real CI. Decision #4 (B2 chaining) not started. Lever #5 (retry plugin) intentionally deferred until sharding + timeout fix are proven on real CI.**

## Explicitly out of scope for this round

- Test suite trimming for "unnecessary" tests - separately audited (2026-08-03), suite found clean; only a 3-way viewport parametrize test had one redundant case, not worth its own PR.
- Duration-based (`pytest-split`) sharding - revisit only if manual file-based balance drifts.
- WIKI-520 (mark-read race bug) - filed, deferred.
- Deeper Lane B redesign (e.g. rewriting highlight-persistence tests to bypass full browser entirely) - bigger architectural change than this round's scope.
- Locking exact `-n` worker counts as final - starting hypothesis only (`-n 2` Lane A, `-n 1`/`-n 2` Lane B); first execution run measures actual peak memory/crash rate and adjusts.

## Target / definition of done

Baseline: 438s wall-clock, 11/773 flaky fails (7 worker crashes + 2 load-artifact timeouts + 1 real bug + 1 unconfirmed). No fixed numeric target set yet - first execution pass re-measures against baseline; zero worker crashes over several consecutive CI runs is the qualitative bar, wall-clock improvement is a secondary/nice-to-have on top of that.
