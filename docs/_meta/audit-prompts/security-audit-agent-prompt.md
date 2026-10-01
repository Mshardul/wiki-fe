# Security Audit Agent — Prompt (wiki-fe)

| Created | Last updated | Status |
|---|---|---|
| 2026-08-01 | 2026-10-01 | current |

Paste this as the prompt when spawning the agent (e.g. `general-purpose` subagent, or a fresh Claude Code session in `wiki-fe`).

---

You are auditing the `wiki-fe` repo (`/Users/shardul/Documents/Github/wiki/wiki-fe`) from the perspective of a security engineer doing a targeted semantic review — not a general code-quality pass (see `codebase-quality-audit-agent-prompt.md` for that), not a UX audit. This is a **Next.js (App Router) + React + TypeScript wiki app**, statically exported for GitHub Pages, with an optional backend (`wiki-be`) for auth + synced bookmarks/recents/reads. Read `CLAUDE.md`/`CONVENTIONS.md` in repo root first — `CLAUDE.md`'s FILE MAP is stale, don't trust it for routing.

Your job: find semantic security gaps a mechanical scanner (Semgrep, running in CI as of this prompt's introduction — see `.github/workflows/ci.yml`'s `semgrep` job) can't catch, because they require understanding *this app's* trust boundaries, not matching a generic vulnerable pattern. Semgrep catches known-bad syntax shapes; this audit exists for the gaps that require actually reasoning about the app's architecture.

This audit is **not**: a general code-quality/consistency pass (`codebase-quality-audit`), a UX/viewport review (`auth-ux-audit`/`mobile-ux-audit`), or a re-run of `tests/e2e/test_security.py`'s existing invariants (this audit hunts for what's *missed*, not what's already regression-guarded — read that test file first so you don't re-report what's already covered).

## Goal

Sweep three specific trust-boundary concerns. Each one is scoped to where this app's actual attack surface is — not a generic OWASP checklist.

### Concern 1 — XSS via unsanitized markdown-derived HTML reaching the DOM

- Article markdown is rendered through a remark/rehype pipeline (`lib/content/pipeline.ts` + `lib/content/plugins/`) at build time, and the resulting HTML is injected into the page via `dangerouslySetInnerHTML`. Grep every `dangerouslySetInnerHTML` usage across `app/` and `components/` and trace each one's data source back to its origin — markdown-derived, user-authored (bookmarks/notes/highlights text), or static/hardcoded. Static/hardcoded strings (e.g. an inlined SVG sprite or a boot-theme script) are not in scope.
- **Check whether any sanitization step exists in the pipeline at all** — confirm whether `lib/content/pipeline.ts` or any plugin in `lib/content/plugins/` runs a sanitizer (e.g. `rehype-sanitize`) over the HTML before it's stored/rendered, or whether the pipeline trusts its own plugin output unconditionally. If no sanitizer is present, assess the actual risk given the content source: article markdown lives in `content/*.md` and is authored by the site owner, not submitted by end users — state plainly whether that make this a real vulnerability or a defense-in-depth gap, and under what condition (e.g. a compromised dependency, a future user-contributed-content feature) it would become exploitable.
- For every `dangerouslySetInnerHTML` site found, classify: sanitized, build-time-only trusted content, or gap — same three-way classification as before, just against the current rendering mechanism.
- User-authored content (notes, highlights, glossary popovers) that gets rendered back as HTML rather than as plain text/React children is in scope too — confirm it's escaped or sanitized, not raw-interpolated. Note that React's default JSX rendering (`{value}`) already escapes by default — only flag places that explicitly opt out via `dangerouslySetInnerHTML` or an equivalent raw-HTML escape hatch.

### Concern 2 — localStorage trust boundaries

- `lib/storage/*` is the only code allowed to touch `localStorage` (per CONVENTIONS.md). This audit checks a different angle: **is data read back out of localStorage ever trusted as if it came from a safe source**, when a user (or an XSS payload, or manual devtools tampering) could have written arbitrary content into that key?
- Specifically: bookmarks, notes, highlights, and settings are all user-writable via the UI and persist as JSON in localStorage. When each is read back and rendered (e.g. a bookmark title, a note body, a highlight's captured text), is it re-sanitized/escaped on the way *out*, or does the code assume "we wrote it, so it's safe" and skip escaping on read? Rendering through plain JSX (`{value}`) is safe by default — the gap to hunt for is any read path that reaches `dangerouslySetInnerHTML` or an equivalent raw-HTML escape hatch instead.
- JSON export/import backup does not exist in the current app (confirmed via grep, zero matches for export/import/download/upload across `app/`/`components/`/`lib/` — see `tests/e2e/test_data_backup.py`'s header note). Skip this check; it has no surface to audit. `PreferencesModal`'s Advanced tab exposes only a single global "Clear everything" action (`lib/storage/data-clear.ts`) — confirm it doesn't read back any externally-supplied data, just wipes known keys.
- Cross-tab `storage` event listeners (`lib/storage/sync.ts`, `components/sync/*`) that react to `localStorage` changes from another tab/origin-adjacent context — confirm they validate the incoming value shape before applying it, not just checking the key name.

### Concern 3 — Service-worker cache-poisoning risk

- `app/sw.ts` (built via Serwist) caches static assets and, per its runtime-caching config, responses for offline use. Trace what the SW's precache list and runtime-caching strategies actually cache: does any strategy cache *any* response regardless of status code/origin, or does it validate `response.ok`/same-origin before writing to cache? Serwist strategies (`CacheFirst`, `NetworkFirst`, etc.) have their own default status/origin handling — confirm the configured strategy and options per route actually enforce that, rather than assuming Serwist's defaults are safe without checking. An SW that caches a non-2xx response (e.g. a captured error page, or a response from a redirect to an unexpected origin) can serve that poisoned response to every future offline visit until the cache version bumps.
- Confirm the SW's cache-key strategy (Serwist's `matchOptions`/plugins, if customized) doesn't let query-string or fragment variance cause cache confusion (e.g. two different logical resources colliding on the same cache key, or a cache-key normalization that strips something security-relevant).
- Confirm cross-origin requests (the `wiki-be` API calls, CDN assets) are either excluded from SW caching entirely or explicitly validated — caching an API response that includes any user-identity-adjacent data would be a bigger problem than caching a static asset, since SW cache isn't cleared on logout.
- This is a static-code review of `app/sw.ts`'s runtime-caching config and any custom strategy/plugin logic — no live SW install/offline-mode testing required unless a hypothesis can't be resolved from reading the file alone.

## Method

**Single pass, concern by concern**, not file by file:

1. Use `ctx_batch_execute`/`ctx_execute_file` (not `Read`) for all file reads and greps — this audit spans `app/`, `components/`, `lib/content/`, `lib/storage/`, and `app/sw.ts`.
2. Read `tests/e2e/test_security.py` first so existing regression-guarded invariants aren't re-reported as new findings — only report gaps, not what's already covered.
3. For **Concern 1**, grep every `dangerouslySetInnerHTML` in `app/` and `components/`, trace each source's data origin, and classify: sanitized, build-time-trusted content, or gap.
4. For **Concern 2**, read every `lib/storage/*.ts` file's read path (not just write path) for each user-writable data type.
5. For **Concern 3**, read `app/sw.ts`'s Serwist runtime-caching config and cache-write logic in full.

## Output file

Log to **`docs/_meta/audit-reports/security-audit - YYYYMMDD.md`** (today's date, one file per run). Two-stage write pattern within that single file:

- **As you find each issue**, immediately append it as a flat entry under a top-level `## Raw log` section at the bottom of the file (create on first write).
- **Periodically (after finishing each concern above)**, move that concern's raw-log entries up into the proper section under `## Findings by concern`, sorted critical → major → minor, and delete them from the raw log.

### Entry format

```markdown
### [SEVERITY] Short title

- **Concern:** xss-sanitization | localstorage-trust | sw-cache-poisoning
- **Files:** `components/reader/SomeComponent.tsx:84`
- **Observation:** `dangerouslySetInnerHTML` renders a value sourced from localStorage-cached data with no sanitization step in the read path
- **Impact:** a prior XSS write or direct devtools edit of the cached localStorage value would render unsanitized on every mount
- **Fix direction:** sanitize on read, or switch to plain JSX text rendering if no HTML content is actually needed in this field
```

Severity is one of exactly 3 values — `CRITICAL` (exploitable now, no precondition beyond normal app usage — e.g. a confirmed unsanitized render path reachable from markdown content), `MAJOR` (exploitable under a realistic precondition — e.g. CDN failure, imported backup file, a second browser tab), `MINOR` (defense-in-depth gap, not independently exploitable). Every finding must name the concrete precondition for exploitability — no "theoretically could be an issue" entries without one.

Final file structure:

```markdown
# Security Audit (wiki-fe)

Generated by security audit agent. Semantic security gaps Semgrep's CI job can't catch — not a
general code-quality audit (see `codebase-quality-audit`) or a re-run of `test_security.py`'s
existing invariants.

## Findings by concern

### XSS via unsanitized markdown output
### localStorage trust boundaries
### Service-worker cache-poisoning risk

## Raw log
(empty once fully organized)
```

## Constraints

- **Do not fix anything.** Report, don't patch. Note fix direction, leave code untouched.
- **Do not read `content/**/*.md`** — irrelevant to this audit.
- **Do not run any tests.** Read `test_security.py` for context only, never execute it or the full suite.
- **Do not propose replacing the remark/rehype pipeline or adding new runtime dependencies** — flag gaps in how the existing tools are used (e.g. an unused sanitizer option, a missing plugin in the existing chain), not a stack change.
- No `git add`/`commit`/`push`.

## When done

Summarize in your final message: total findings by severity count, and every `CRITICAL`/`MAJOR` finding by name. Full detail lives in the file, not in your response.
