# E2E CI Health Audit Agent - Prompt (wiki-fe)

Paste this as the prompt when spawning the agent (e.g. `general-purpose` subagent, or a fresh Claude Code session in `wiki-fe`).

---

You are auditing the `wiki-fe` repo (`/Users/shardul/Documents/Github/wiki/wiki-fe`) e2e test suite's CI health - not a test-content audit (are the tests correct/well-written), a **resource and drift audit**: has the suite regressed back toward the crash/slowness pattern fixed by `docs/_meta/plans/e2e-ci-resource-hardening.md`, or drifted away from the decisions recorded there. Read that plan doc first - it's the baseline this audit checks against. Read `CLAUDE.md`/`CONVENTIONS.md` in repo root first for project context.

This audit is **not**: a review of whether individual tests are well-written or worth keeping (that's a one-off test-content audit, not this), a security review (`security-audit-agent-prompt.md`), or a UX audit. It exists to answer one question periodically: **is the e2e suite still healthy on CI, or has it drifted?**

## Goal

Check four things, each tied to a specific decision in the plan doc.

### Check 1 - Lane A/Lane B classification drift

- The plan's mechanical rule: a test is Lane B (`@pytest.mark.heavy`) if it does canvas/PNG rasterization or file download, real animation/timing waits (`wait_for_timeout`, fixed sleeps - not `wait_for_selector`), or large DOM ops (bulk content load, big index render). Everything else is Lane A.
- Grep all of `tests/e2e/*.py` for tests matching those patterns (canvas/download/`wait_for_timeout`/sleep/bulk-load) and cross-check against which are actually marked `@pytest.mark.heavy`. Flag: any test that matches the heavy criteria but isn't marked (drift toward the pre-fix crash pattern), and any test marked heavy that no longer matches (over-conservative, costing Lane B time for no reason).
- Confirm the marker still exists and CI config (`.github/workflows/ci.yml`) still filters on it (`-m "not heavy"` / `-m heavy` or equivalent) for the `tests-light`/`tests-heavy` job split.

### Check 2 - Worker/resource configuration regression

- Confirm `.github/workflows/ci.yml`'s test job(s) still use bounded worker counts (not bare `-n auto`) and the sharding structure from the plan (3 file-based shards, or whatever the current committed structure is - read the actual yaml, don't assume the plan's numbers are still exact).
- Confirm `xdist_group`/`--dist loadgroup` pinning for Lane B is still present if Lane B tests exist.
- Check `requirements-dev.txt` for `pytest-playwright`/`pytest-xdist`/`pytest-rerunfailures` version drift, and if a rerun/retry plugin is in use, confirm it's still scoped to crash-type failures only (grep its config for any sign it's silently retrying assertion failures, which would mask real bugs).
- Check whether the Playwright browser binary install step in CI has a cache step (`actions/cache` keyed on Playwright version) - flag if it regressed to uncached.

### Check 3 - New test growth against the resource budget

- Run test collection (`pytest tests/ --collect-only -q`, read-only, just to count - do not run the suite) and compare total test count against the last recorded count in the most recent prior audit report (`docs/_meta/audit-reports/e2e-ci-health-audit - *.md`, most recent by filename date) if one exists. Report the delta.
- If total test count or Lane B test count grew significantly since the last audit, note it - this audit doesn't have a fixed growth threshold to enforce (explicitly out of scope per the plan), just report the trend so a human can judge.

### Check 4 - B2 sequencing pattern conformance

- The plan identified 4 groups of tests in `test_content_enhancements.py` (highlight lifecycle, marker lifecycle, highlight reload/reanchor/drop, save-as-card) as candidates for chaining into ordered sequences to cut redundant setup. Check whether that chaining was implemented (search for it - chained sequences, or evidence the groups are still separate tests each redoing full setup).
- If new tests have been added since that also share the `_select_word` + toolbar-open (or equivalent heavy-setup) boilerplate pattern without chaining, flag them as new B2 candidates - don't just re-report the original 4 groups if they're already resolved.

## Method

**Single pass, check by check**, not file by file:

1. Use `ctx_batch_execute`/`ctx_execute_file` (not `Read`) for all file reads and greps - this audit spans all of `tests/e2e/*.py`, `tests/conftest.py`, `.github/workflows/ci.yml`, `requirements-dev.txt`, and prior audit reports.
2. Read `docs/_meta/plans/e2e-ci-resource-hardening.md` in full first - it's the baseline for every check below.
3. Read the most recent prior `docs/_meta/audit-reports/e2e-ci-health-audit - *.md` report if one exists, for the Check 3 delta comparison.
4. For **Check 1**, grep every test file for the heavy-criteria patterns and cross-reference against `@pytest.mark.heavy` usage.
5. For **Check 2**, read `.github/workflows/ci.yml` in full and `requirements-dev.txt`.
6. For **Check 3**, run `pytest tests/ --collect-only -q` (collection only - this does not launch a browser or run tests, safe to run) and count.
7. For **Check 4**, read `tests/e2e/test_content_enhancements.py` and check chaining status of the 4 named groups, then scan for new unchained duplication.

## Output file

Log to **`docs/_meta/audit-reports/e2e-ci-health-audit - YYYYMMDD.md`** (today's date, one file per run).

### Entry format

```markdown
### [SEVERITY] Short title

- **Check:** lane-classification-drift | worker-config-regression | test-growth | b2-sequencing
- **Files:** `tests/e2e/test_content_enhancements.py:3210`
- **Observation:** what the audit found, concretely
- **Baseline (from plan doc):** what the plan committed to
- **Drift:** what's actually true now, and the gap
- **Fix direction:** what would close the gap
```

Severity is one of exactly 3 values - `CRITICAL` (actively causing CI crashes/failures right now - e.g. `-n auto` reintroduced, or a heavy test unmarked and crashing workers), `MAJOR` (drifted from the plan in a way that will cause problems soon but isn't failing yet - e.g. cache step removed, marker present but CI no longer filters on it), `MINOR` (cosmetic/small drift, e.g. one new unchained B2 candidate, small test-count growth). Every finding must cite the specific baseline decision it's drifted from - no "this seems suboptimal" entries without a plan-doc anchor.

Final file structure:

```markdown
# E2E CI Health Audit (wiki-fe)

Generated by e2e-ci-health audit agent. Checks drift against `docs/_meta/plans/e2e-ci-resource-hardening.md` -
not a test-content quality audit or a security audit.

Test count this run: N (prior run: M, delta: +/-X)

## Findings by check

### Lane A/Lane B classification drift
### Worker/resource configuration regression
### New test growth against the resource budget
### B2 sequencing pattern conformance

## Raw log
(empty once fully organized)
```

## Constraints

- **Do not fix anything.** Report, don't patch. Note fix direction, leave code untouched.
- **Do not run the full test suite.** Collection only (`--collect-only -q`) for the count in Check 3 - never execute tests, never launch a browser.
- **Do not read `content/**/*.md`** - irrelevant to this audit.
- **Do not re-litigate whether individual tests are "worth keeping"** - that's a different audit; this one only checks CI resource health and plan conformance.
- No `git add`/`commit`/`push`.

## When done

Summarize in your final message: test count delta, total findings by severity count, and every `CRITICAL`/`MAJOR` finding by name. Full detail lives in the file, not in your response.
