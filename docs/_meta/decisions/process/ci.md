# CI & Pre-commit Hooks

**Phase 1 — language-agnostic, no node toolchain.** The FE is a build-free vanilla-JS
static site (no `package.json`, no `node_modules`, ES modules loaded straight from disk).
Hooks are deliberately limited to language-agnostic guardrails. JS/CSS linting and
formatting (ESLint/Prettier/markdownlint) are **deferred** — they require introducing a
node toolchain, which is postponed until a real trigger lands (most likely a TypeScript
migration or a build step). See the discussion that produced this decision.

## Pre-commit Hooks

Two configs:

- `.pre-commit-config.yaml` — local hooks, run on every commit. May auto-fix in place.
- `.pre-commit-config.ci.yaml` — check-only, used by CI. Fixer hooks exit non-zero when
  they would change a file (failing the build) but never rewrite; `codespell` runs without
  `-w`. CI reports, never commits.

Both share `exclude: ^(content/|.venv/|docs/superpowers/|.pytest_cache/)` — `content/` is
1.5M of authored markdown and is kept out of prose/whitespace/spell hooks.

| Hook                      | Description                                                          |
| ------------------------- | ------------------------------------------------------------------- |
| `gitleaks`                | Secret scanning.                                                    |
| `codespell`               | Spell-checks code, comments, project docs. Skips data/min/manifest. |
| `detect-private-key`      | Blocks accidental private-key commits.                              |
| `end-of-file-fixer`       | Ensures every file ends with a single newline.                      |
| `trailing-whitespace`     | Strips trailing whitespace.                                         |
| `check-yaml`              | Validates YAML syntax.                                              |
| `check-json`              | Validates JSON syntax.                                              |
| `check-added-large-files` | Blocks files larger than 500kb.                                     |
| `check-merge-conflict`    | Catches stray conflict markers.                                     |
| `check-case-conflict`     | Catches filename casing clashes on case-insensitive filesystems.    |

**Not included (deferred to a future node phase):** `prettier`, `markdownlint`, ESLint.
Tests are **not** run on commit — the playwright suite is slow; CI runs the full suite.

Install locally: `make install` (creates venv, installs deps, runs `pre-commit install`).
Run all hooks: `make precommit`.

---

## GitHub Actions CI (`.github/workflows/ci.yml`)

Triggers on push to `main` and all PRs. Concurrency-cancels superseded runs per ref.

| Job          | Description                                                                          |
| ------------ | ----------------------------------------------------------------------------------- |
| `hooks`      | Runs all hooks via `.pre-commit-config.ci.yaml` (check-only) on the full file tree. |
| `tests`      | Installs deps + Chromium, runs the full playwright e2e suite (`pytest tests/ -q`).  |
| `dead-links` | Runs `lychee` offline across `.md`/`.html`; `content/` excluded (app hash routes).  |
