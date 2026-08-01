# Security Audit Agent — Prompt (wiki-fe)

Paste this as the prompt when spawning the agent (e.g. `general-purpose` subagent, or a fresh Claude Code session in `wiki-fe`).

---

You are auditing the `wiki-fe` repo (`/Users/shardul/Documents/Github/wiki/wiki-fe`) from the perspective of a security engineer doing a targeted semantic review — not a general code-quality pass (see `codebase-quality-audit-agent-prompt.md` for that), not a UX audit. This is a **build-free, vanilla JS/HTML/CSS wiki app**, no framework, no bundler, static-hosted on GitHub Pages, with an optional backend (`wiki-be`) for auth + synced bookmarks/recents/reads. Read `CLAUDE.md`/`CONVENTIONS.md` in repo root first.

Your job: find semantic security gaps a mechanical scanner (Semgrep, running in CI as of this prompt's introduction — see `.github/workflows/ci.yml`'s `semgrep` job) can't catch, because they require understanding *this app's* trust boundaries, not matching a generic vulnerable pattern. Semgrep catches known-bad syntax shapes; this audit exists for the gaps that require actually reasoning about the app's architecture.

This audit is **not**: a general code-quality/consistency pass (`codebase-quality-audit`), a UX/viewport review (`auth-ux-audit`/`mobile-ux-audit`), or a re-run of `tests/e2e/test_security.py`'s existing invariants (this audit hunts for what's *missed*, not what's already regression-guarded — read that test file first so you don't re-report what's already covered).

## Goal

Sweep four specific trust-boundary concerns. Each one is scoped to where this app's actual attack surface is — not a generic OWASP checklist.

### Concern 1 — XSS via unsanitized markdown/Showdown output reaching `innerHTML`

- Every `.innerHTML =` assignment in `js/` where the right-hand side traces back to Showdown's `makeHtml()` output (markdown-derived HTML) must go through `DOMPurify.sanitize()` first. Grep every `innerHTML` assignment in `js/render/` and `js/content/` and trace each one's data source back to its origin — markdown-derived, user-authored (bookmarks/notes/highlights text), or static/hardcoded. Static/hardcoded strings are not in scope.
- **Known existing pattern to verify hasn't regressed**: `js/render/content-view.js` has multiple `DOMPurify.sanitize(...)` call sites gating markdown output, but at least one (`previewEl.innerHTML = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml;`) falls back to the **unsanitized** `rawHtml` when `DOMPurify` is undefined instead of failing closed (e.g. skipping the render or escaping instead). Confirm whether this fallback is still present, and whether any *other* sanitized call site shares the same fail-open shape — that's the pattern to hunt for, not just this one instance.
- Check every other conditional-sanitize shape (`typeof DOMPurify !== "undefined" ? sanitize(x) : x`) app-wide for the same fail-open gap.
- User-authored content (notes, highlights, glossary popovers) that gets rendered back as HTML rather than `textContent` is in scope too — confirm it's either escaped (`escHtml` from `state.js`) or sanitized, not raw-interpolated.

### Concern 2 — localStorage trust boundaries

- `js/storage/*` is the only code allowed to touch `localStorage` (per CONVENTIONS.md). This audit checks a different angle: **is data read back out of localStorage ever trusted as if it came from a safe source**, when a user (or an XSS payload, or manual devtools tampering) could have written arbitrary content into that key?
- Specifically: bookmarks, notes, highlights, and settings are all user-writable via the UI and persist as JSON in localStorage. When each is read back and rendered (e.g. a bookmark title, a note body, a highlight's captured text), is it re-sanitized/escaped on the way *out*, or does the code assume "we wrote it, so it's safe" and skip escaping on read? The escaping needs to happen at render time regardless of what wrote the value — a prior XSS bug or direct devtools edit of localStorage is the threat model here, not just the normal write path.
- Check `settings-theme.js`'s backup import/export path (`_validateBackup` and the restore flow) — an imported backup JSON is fully attacker-controlled if a user imports a file from an untrusted source. Confirm restored values are validated/sanitized before being written back into live settings and localStorage, not just shape-checked.
- Cross-tab `storage` event listeners (`settings-theme.js`, `auth.js`) that react to `localStorage` changes from another tab/origin-adjacent context — confirm they validate the incoming value shape before applying it, not just checking the key name.

### Concern 3 — BroadcastChannel / postMessage origin checks (sidecar TOC)

- The sidecar TOC feature (`js/app/sidecar-toc.js` publisher, `js/toc-companion.js` receiver, `toc-companion.html`) uses `BroadcastChannel` to pass nav/TOC data between the main window and a popup window it opens.
- `BroadcastChannel` is same-origin-only by browser design (unlike `postMessage`, which requires an explicit origin check), so confirm the implementation actually relies on that guarantee and doesn't also accept a cross-origin `postMessage` fallback or listener anywhere in this feature's code path that would reintroduce the risk `BroadcastChannel` is supposed to avoid.
- If any `postMessage`/`onmessage` usage exists anywhere in `js/` (grep the whole tree, not just sidecar-toc), confirm every listener validates `event.origin` against an expected value before trusting `event.data` — an unchecked listener accepting messages from any origin is the specific bug shape to hunt for.
- Confirm the popup window (`toc-companion.html`) doesn't expose any capability back to the opener beyond the intended nav-click messages (e.g. no `window.opener` reference left unguarded that a malicious popup replacement could exploit — check whether the window is opened with `noopener` where appropriate, weighed against whether the feature actually needs the opener reference to function).

### Concern 4 — Service-worker cache-poisoning risk

- `wiki-sw.js` caches static assets and (per its fetch handler) responses for offline use. Trace what the SW's fetch handler caches: does it cache *any* response regardless of status code/origin, or does it validate `response.ok`/same-origin before writing to cache? An SW that caches a non-2xx response (e.g. a captured error page, or a response from a redirect to an unexpected origin) can serve that poisoned response to every future offline visit until the cache version bumps.
- Confirm the SW's cache-key strategy doesn't let query-string or fragment variance cause cache confusion (e.g. two different logical resources colliding on the same cache key, or a cache-key normalization that strips something security-relevant).
- Confirm cross-origin requests (the `wiki-be` API calls, CDN assets) are either excluded from SW caching entirely or explicitly validated — caching an API response that includes any user-identity-adjacent data would be a bigger problem than caching a static asset, since SW cache isn't cleared on logout.
- This is a static-code review of `wiki-sw.js`'s fetch/cache logic — no live SW install/offline-mode testing required unless a hypothesis can't be resolved from reading the file alone.

## Method

**Single pass, concern by concern**, not file by file:

1. Use `ctx_batch_execute`/`ctx_execute_file` (not `Read`) for all file reads and greps — this audit spans `js/render/`, `js/content/`, `js/storage/`, `js/app/sidecar-toc.js`, `js/toc-companion.js`, `toc-companion.html`, and `wiki-sw.js`.
2. Read `tests/e2e/test_security.py` first so existing regression-guarded invariants aren't re-reported as new findings — only report gaps, not what's already covered.
3. For **Concern 1**, grep every `.innerHTML =` in `js/render/` and `js/content/`, trace each RHS's data source, and classify: sanitized, escaped, static/safe, or gap.
4. For **Concern 2**, read every `js/storage/*.js` file's read path (not just write path) for each user-writable data type, and check `settings-theme.js`'s backup-restore flow specifically.
5. For **Concern 3**, grep the whole `js/` tree for `postMessage`, `onmessage`, and `BroadcastChannel`, and trace the sidecar-TOC message flow end to end.
6. For **Concern 4**, read `wiki-sw.js`'s fetch event handler and cache-write logic in full.

## Output file

Log to **`docs/_meta/audit-reports/security-audit - YYYYMMDD.md`** (today's date, one file per run). Two-stage write pattern within that single file:

- **As you find each issue**, immediately append it as a flat entry under a top-level `## Raw log` section at the bottom of the file (create on first write).
- **Periodically (after finishing each concern above)**, move that concern's raw-log entries up into the proper section under `## Findings by concern`, sorted critical → major → minor, and delete them from the raw log.

### Entry format

```markdown
### [SEVERITY] Short title

- **Concern:** xss-sanitization | localstorage-trust | postmessage-origin | sw-cache-poisoning
- **Files:** `js/render/content-view.js:848`
- **Observation:** conditional sanitize falls back to unsanitized `rawHtml` when `DOMPurify` is undefined
- **Impact:** if the DOMPurify CDN script fails to load (network failure, ad-blocker, CDN outage), markdown-derived HTML renders unsanitized, reopening XSS via any malicious content that reached this render path
- **Fix direction:** fail closed — skip the render or escape via `escHtml` instead of rendering raw HTML when DOMPurify is unavailable
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
### BroadcastChannel/postMessage origin checks
### Service-worker cache-poisoning risk

## Raw log
(empty once fully organized)
```

## Constraints

- **Do not fix anything.** Report, don't patch. Note fix direction, leave code untouched.
- **Do not read `content/**/*.md`** — irrelevant to this audit.
- **Do not run any tests.** Read `test_security.py` for context only, never execute it or the full suite.
- **Do not propose replacing DOMPurify/Showdown or adding new runtime dependencies** — flag gaps in how the existing tools are used, not a stack change.
- No `git add`/`commit`/`push`.

## When done

Summarize in your final message: total findings by severity count, and every `CRITICAL`/`MAJOR` finding by name. Full detail lives in the file, not in your response.
