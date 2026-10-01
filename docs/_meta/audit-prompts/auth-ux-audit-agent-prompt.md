# Auth UX Audit Agent — Prompt

| Created | Last updated | Status |
|---|---|---|
| 2026-07-09 | 2026-10-01 | current |

Paste this as the prompt when spawning the agent (e.g. `general-purpose` subagent, or a fresh Claude Code session in `wiki-fe`).

---

You are auditing the `wiki-fe` repo (`/Users/shardul/Documents/Github/wiki/wiki-fe`) from the perspective of a senior frontend developer reviewing the register/login/account flows as if you were a brand-new user going through them for the first time. This is a **Next.js (App Router) + React + TypeScript wiki app**, statically exported to `out/` for GitHub Pages (see `CLAUDE.md` / `CONVENTIONS.md` in repo root, read them first — `CLAUDE.md`'s FILE MAP is stale, don't trust it for routing). Your job: find every gap, bug, and rough edge — big or small — in the auth experience, and log each one to a running file as you find it — not at the end, not from memory.

A companion agent is auditing `wiki-be` (the backend auth API) in parallel. You are FE-only: treat the backend as a black box you interact with through `lib/api.ts`, and note API-contract mismatches you observe from the FE side (unexpected error shapes, missing fields, etc.) — but do not go read or judge backend code.

## Goal

Walk through **every step of the auth journey**, not just login/register in isolation: registration → password rules/checklist → submit → email verification → resend verification → login → session persistence across reload/tab → protected-content gating → logout → forgot password → reset password → anon-to-account data migration. List every issue you find: broken states, confusing copy, missing feedback, silent failures, validation mismatches, accessibility gaps, mobile-specific breakage, race conditions (double-submit), and anything that would make a real user confused, stuck, or distrustful. Also check browser native autofill/password-manager behavior (not just autocomplete attributes) and do a dedicated copy/tone pass across every user-facing string. Be exhaustive — quantity and precision both matter more than brevity here.

## Method: code read first, then browser verification

**Phase 1 — static read-through:**
Use `ctx_batch_execute`/`ctx_execute_file` (not `Read`) to go through `components/auth/AuthModal.tsx`, `components/auth/AuthButton.tsx`, `components/auth/authModalController.ts`, `components/auth/PasswordChecklist.tsx`, `lib/auth/authFlows.ts`, `lib/auth/passwordRules.ts`, `lib/api.ts`, `css/components/auth.css`, `lib/storage/session.ts`, `lib/toast.ts`, `lib/storage/sync.ts` (multi-tab listener), and `lib/storage/bookmarks.ts` + `lib/storage/recents.ts` (anon-data carryover). Re-derive this file list first with `find components/auth lib/auth -type f` in case it's grown since this prompt was last edited. Trace each flow end-to-end: what triggers each request, what does success/error do to the DOM, what does the user see and where. Specifically check that a session-expired signal exists and updates the UI (a React context/hook or equivalent — see `CONVENTIONS.md` → Errors & API for the documented contract). Note anything suspicious as a **hypothesis** — don't log it as confirmed yet; append each to a scratch `## Phase 1 hypotheses` section at the bottom of the output file, and clear each entry once Phase 2 confirms or discards it. Also diff client-side password validation rules in `lib/auth/passwordRules.ts` against the documented policy in `docs/_meta/auth.md` (Password policy section) — do not read `wiki-be` code to confirm, just note the mismatch as observed from FE against the documented contract.

Do not run any tests — full suite or individual files. Assume `tests/e2e/test_auth.py` is correct and passing; this audit is a fresh manual pass, not a test run.

**Phase 2 — live browser verification:**
Serve the site locally: build the static export first (`pnpm build`, produces `out/`), then serve it the same way `tests/conftest.py`'s `base_url` fixture does — a `SimpleHTTPRequestHandler`/`http.server` rooted at `out/`, with the `/wiki-fe` prefix stripped and trailing-slash redirect behavior matched (read that fixture, don't reinvent it; a plain `python3 -m http.server` from repo root serves the wrong tree and will 404 on every route). **Use a random free port, not the codebase's default (8000)** — that port may already be in use by the user's own dev server; pick an arbitrary high port (e.g. `python3 -m http.server 0` to let the OS assign one, or any unused port) and check it's free first. Use the Playwright MCP tools (`browser_navigate`, `browser_resize`, `browser_snapshot`/`browser_take_screenshot`, `browser_click`, `browser_type`, `browser_evaluate`, `browser_network_requests`, etc.) to:

1. Drive every flow listed in "Journey checklist" below, as a real user would — click the actual buttons, type in the actual fields, read the actual on-screen copy.
2. Confirm or discard each Phase-1 hypothesis, and capture new issues you only see live (actual error message text, actual timing/loading states, actual focus behavior, actual DOM state after an action).
3. Check both desktop (1280px) and mobile (390px) viewports — `test_auth.py` shows the auth dialog is a bottom sheet under 640px with a drag handle (`#auth-modal`, `.auth-dialog`, .auth-drag-handle`); verify this still behaves correctly through every step, not just on open.
4. Use `browser_network_requests` to catch things like duplicate requests from double-submit, or requests firing when they shouldn't (e.g. before validation passes).

No network throttling — Playwright MCP here has no reliable built-in throttle control. Skip it; instead simulate failure by routing a request to fail/hang (`page.route` equivalent) or just note network/loading-state gaps you see in the code (no disabled-state on submit, no timeout handling) as findings.

A companion agent audits `wiki-be` in parallel against the same local backend/DB — use a unique email pattern per test registration (e.g. `fe-audit-{timestamp}@example.com`) to avoid colliding with the backend agent's test accounts or with your own repeated runs. Don't bother cleaning up test accounts as you go; if the backend exposes an easy bulk-cleanup path, note it as a followup at the end rather than doing it mid-audit.

## Journey checklist

Work through these in order, as a first-time user would — narrate the step to yourself before judging it. Pull current selectors fresh from `tests/e2e/test_auth.py` before starting — don't trust any selector list hand-copied into this prompt, verify each one against the real DOM.

1. **Discovery** — land on the site logged out. How do you find the way to register/log in? Is the entry point obvious on both desktop and mobile?
2. **Register form** — empty submit, invalid email format, weak password (watch the checklist turning green/red per `test_register_checklist_turns_green`), mismatched confirm password (if one exists), already-registered email, submit-button state while request is in flight, rapid double-click/double-submit.
3. **Post-register state** — what does the user see immediately after? Is it clear whether they're logged in or still need to verify? Any dead-end states?
4. **Email verification** — you likely can't click a real email link; instead read `lib/auth/authFlows.ts` for how the verify flow is wired (URL param / route?) and drive it directly via URL if possible.
    Check: expired token, malformed token, already-used token behavior/messaging. If a case can't be triggered without a real backend-signed token, don't skip it silently — log it as `[UNTESTABLE]` with the reason.
5. **Resend verification** — is there a clear affordance? What feedback on click? Any rate-limit messaging, and if so is it user-friendly?
6. **Login** — correct creds, wrong password, unknown email, empty fields, Enter-key submit vs button click, autocomplete/autofill attributes on the fields, unverified-account login attempt. Test actual browser autofill (not just attribute presence): save creds via browser password manager, reload, let it autofill login/register fields — does the password-checklist JS re-validate on autofill (`input` event fires?) or does it stay stuck showing all-red/unvalidated while the submit button thinks the field is empty?
7. **Session reflection** — after login, does the UI (topbar, auth button, any gated content) update immediately without a manual refresh? Reload the page — does the session survive? Open a second tab — same session state?
8. **Logout** — does the UI fully reset to logged-out state? Press browser back after logout — any stale authenticated UI visible?
9. **Forgot / reset password** — request reset for a known vs unknown email (does the messaging differ in a way that leaks account existence?), follow the reset flow, set a new password, confirm the old password stops working, check whether other active sessions get invalidated.
10. **Anon → account migration** — `lib/auth/authFlows.ts` is noted to own "anon→login migration"; if the user had bookmarks/recents/settings as anonymous before registering or logging in, do they carry over correctly, get merged, or get silently dropped?
11. **Keyboard & screen-reader pass** — tab order through the whole modal, can every action be completed without a mouse, are error messages associated with their fields (`aria-describedby` or similar), is focus managed sensibly when the modal opens/closes or switches panels.
12. **Mobile pass** — repeat steps 2, 6, 9 at 390px width specifically, watching for the bottom-sheet behavior interacting badly with the on-screen keyboard, cramped touch targets, or content cut off below the fold.
13. **Copy & tone audit** — pull every user-facing string across the whole auth surface (button labels, field labels/placeholders, helper text, every error message, empty states, success toasts) into one list and read them together, not just in context. Check: consistent tone (formal vs casual doesn't flip mid flow), consistent terminology (same word for the same concept — don't say "sign in" in one place and "log in" in another), error messages that say what happened AND what to do next (not just "Something went wrong"), no raw technical/API-error text leaking to the user, sentence casing/punctuation consistent across all strings. Also verify each error message maps to the correct backend `code` (canonical list in `docs/_meta/auth.md`) — not just that the tone reads well, but that the right message fires for the right `code` (FE-observable via `lib/api.ts`'s error-code handling, no BE code reading needed).

## Output file

Log to **`docs/_meta/audit-reports/auth-ux-audit - YYYYMMDD.md`** (today's date; create the file and, if absent, the `audit-reports/` directory). Two-stage write pattern so nothing is ever lost mid-run, but the final file stays organized:

- **As you find each issue**, immediately append it as a flat entry under a top-level `## Raw log` section at the bottom of the file (create on first write). Do this the moment you find it — do not batch findings in memory and write at the end.
- **Periodically (after finishing each numbered journey-checklist item above)**, move that item's raw-log entries up into a proper section for that step under `## Findings by flow step`, sorted critical → major → minor within the section, and delete them from the raw log. This keeps the raw log as a safety net only, and the top of the file as the organized, fixable output.

### Entry format

```markdown
### [SEVERITY] Short title

- **Flow step:** Register — password validation
- **File:** `lib/auth/authFlows.ts:142` (or "live UI: register panel, mobile 390px")
- **Repro:** Open register panel → type password meeting all rules → checklist shows green → submit → button stays enabled and double-click fires two POST /register requests
- **Impact:** User can trigger duplicate registration attempts; second request likely surfaces a confusing "already registered" error on their own first attempt
- **Fix direction:** disable submit button synchronously on click, before awaiting the request
```

Severity = `CRITICAL` (flow is broken/unusable), `MAJOR` (real bug or bad UX, works but wrong), `MINOR` (rough edge, inconsistency, minor confusion), `POLISH` (nitpick, copy/spacing/style). Severity is purely about functional/UX impact — security relevance is a separate, orthogonal axis. Tag security-relevant findings with a leading `[SECURITY]` in the title regardless of severity bucket (e.g. account-enumeration via forgot-password messaging); a security finding can land in any severity tier depending on its functional impact.

Final file structure:

```markdown
# Auth UX Audit

Generated by auth UX audit agent. FE-only — see wiki-be's companion audit for backend findings.

## Findings by flow step

### Discovery
### Register form
### Post-register state
### Email verification
### Resend verification
### Login
### Session reflection (reload / multi-tab)
### Logout
### Forgot / reset password
### Anon → account migration
### Keyboard & screen-reader
### Mobile (bottom sheet, 390px)
### Copy & tone

## Raw log
(empty once fully organized)
```

## Constraints

- **Do not fix anything.** This is audit-only — report, don't patch. If a fix is obvious, note it in "Fix direction" but leave the code untouched.
- **Do not read or judge `wiki-be` code.** Treat the backend as a black box reached through `lib/api.ts`; note contract mismatches observed from the FE side only.
- **Do not read `content/**/*.md`** — irrelevant to this audit.
- **Do not run any tests** — full suite or individual files. Assume `tests/e2e/test_auth.py` is correct and passing.
- Follow `CLAUDE.md`'s file-map guidance — don't read unrelated domain files (`content/`, other `storage/` files, etc.) blindly.
- No `git add`/`commit`/`push`.

## When done

Summarize in your final message: total findings by severity count, and the 3–5 most critical issues by name. Full detail lives in the file, not in your response.
