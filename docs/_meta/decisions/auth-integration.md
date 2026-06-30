# [Archive] Auth Integration — Frontend ↔ Backend

**How** the auth + sync feature wires into the existing vanilla-JS SPA: the API client, session
state, caching model, storage hooks, auth UI, migration, logout. Plus the current build status.

For **what & why** (product model, tech choices, DB schema, contracts — password policy,
session/cookie shape, error codes, security guards), see [auth.md](./auth.md).

Status: **design locked. BE v0 built; FE integration pending.**

---

## Current state (2026-06-18)

| Piece | Status |
| ----- | ------ |
| Repo split (fe/be) | **Done** — both repos live with remotes + history. See [fe-be-split.md](./fe-be-split.md). |
| BE v0 (auth + sync, FastAPI 3-tier, SQLite, Alembic, Resend email, CORS/prod gates, CI, tests) | **Built** in `wiki-be` — register/verify/login/logout/me/resend + bookmarks/reads/recents/import. |
| FE integration (this doc: `api.js`, `state.session`, storage sync hooks, auth modal, topbar button, migration, logout) | **Pending** — no wiring in `wiki-fe/js` yet. |
| Infra/deploy (Fly, custom domain, Resend domain) | Deferred, non-blocking. See [infra-deploy.md](./infra-deploy.md). |

**Next:** the FE integration work below. Step-by-step plan:
`docs/_meta/plans/fe-be-integration.md`.

---

## Frontend ↔ backend + caching

App stays vanilla-JS SPA, hash router, no build, no framework. All FE auth UI = **modals**
(matches existing ⌘K / settings patterns; no new view plumbing).

### Caching model — cache-through (Model B)

- **API = source of truth.** **localStorage = cache** (+ existing service-worker article cache, kept).
- Persistence stays centralized in `storage.js`. Sync hooks inject **inside** the existing save functions — callers (`Bookmarks.toggle`, `markRead`, …) unchanged, minimal blast radius.
  - `get*()` → read localStorage (instant, unchanged).
  - `save*()` → write localStorage **+** if logged in, fire API call.
  - **On login / boot (logged in):** pull from API → merge into localStorage → re-render.
  - **Anon:** exactly today's behavior, zero API.
- **Writes = fire-and-forget:** write localStorage, async POST/DELETE, don't await, ignore transient failures — next load-time pull reconciles drift. UI stays instant.

### Session state (FE)

- Cookie (httpOnly) = real auth, **JS cannot read it**. JS needs its own "logged-in?" signal.
- **`state.session = { user: null|{id,email}, status: "loading"|"in"|"out" }`**, held **in memory** in `state.js`.
- Boot calls **`GET /auth/me`** once → sets `state.session`. **Identity is NOT cached in localStorage** (one source of truth = cookie/BE).
- **SPA navigation (article→article) = zero re-calls** — JS instance stays alive, memory persists. `/auth/me` fires only on a real page load (refresh / first open) → ~1 call per app open, not per article.
- In-memory state lives as long as the tab is open; the cookie (30-day sliding — see Session model in [auth.md](./auth.md)) is always the authority.
- **Staleness handled lazily (Option A):** any API call returning **401** → global handler flips `state.session` to logged-out, prompts re-login. No polling, no focus re-check (add later if stale-tab UX warrants).
- User-data cache (bookmarks etc) still lives in localStorage; only _identity_ is never cached.

### API client (`js/api.js`)

New module — single wrapper all BE calls go through (no existing module owns "talk to backend").

- **Base URL** from a config constant (`BACKEND_URL`). No build step → no FE `.env`. **Hostname-detect:** `localhost → local BE, else → prod fly.dev`. The BE URL is **public by nature** (browser must call it) — not a secret; security = CORS + cookie + BE validation, not URL obscurity.
- `credentials: "include"` on every call (set once here).
- JSON in/out; throws `ApiError(code, message, status)` on non-2xx (parsed from the error envelope) → callers `catch` and switch on `code`.
- **Global 401 handler:** any 401 → flip `state.session` to logged-out, emit `wiki:session-expired` → UI reacts (Option A). Callers never repeat 401 logic.
- Thin helpers `api.get/post/del`. Storage sync uses fire-and-forget (`.catch(()=>{})`); failed writes are **dropped, not queued** in v0 — load-time pull reconciles (retry-queue = v3).

**Same-origin later:** when a custom domain is bought, switch the base to relative `/api/...` (no BE URL in code, `SameSite=Lax`). Same-origin = DNS/routing (e.g. Cloudflare free), **not vendor lock-in**; deferred only because no domain yet.

### Anon → login migration

On login, if **local anon data exists**, show one prompt (generic copy — scales to future data types: highlights, notes):

> "You have unsaved items on this device from browsing signed out. Keep them in your account, or discard?" **[Keep them] [Discard]**

- **Keep** → `POST /sync/import` (merge/union all categories) → then pull server set.
- **Discard** → drop local → pull server set.
- **No local data** → no prompt, just pull server set.
- Never blocks login; no "merge" jargon — plain keep/discard.

**Post-login sequence:** (optional import) → `GET` all lists → overwrite localStorage with server truth → re-render. After first sync on a device, local IS the synced cache → no more prompts.

### Logout

- **Always succeeds, never blocked** on sync. `POST /auth/logout` (kill session) + clear user-data cache.
- **B-lite flush:** logout first fires a quick best-effort flush of any known-unsynced items (short timeout, no long await), then clears cache + logs out **regardless of result**. With fire-and-forget writes, most items already synced per-action, so this is usually instant; it just minimizes loss of a last unsynced write. Rare loss accepted (low-stakes data).
- Clearing cache on logout keeps the next login clean (migration prompt only triggers on genuinely anon data, not another account's leftovers).

### UI affordances (auth scope only)

Auth adds exactly one visible control + one modal. Broader topbar declutter is a separate ticket (separate refactor, not auth).

- **Login/logout icon button** in the topbar — the _only_ new auth UI in the topbar. Logged out → "Login"; logged in → "Logout". Account/email shown inside the **preferences panel** (panel renamed "Settings" → "Preferences" under another ticket).
- **Auth modal — one modal, swapped content** (reuses existing modal pattern): login ↔ register ↔ verify-pending ↔ session-expired. Minimal.
  - **Register** panel: email, password + **live 5-rule checklist** (see Password policy in [auth.md](./auth.md)), submit disabled until all green, toggle to login.
  - **Verify-pending** panel: "Check your email to verify" + **Resend** button (`/auth/resend-verification`). Stays in-modal (flow contained).
- **401 / session-expired:** global handler → toast ("Session expired, please log in") + **reopen the login modal**.

### Offline

- Articles stay readable (SW cache). v0 may require online for user-data writes; offline write-queue is a v3 nicety.

---

## Repo migration

See [fe-be-split.md](./fe-be-split.md).

---

## Deferred to implementation (non-blocking)

- Highlight text-anchoring strategy (v1's hard problem).
- Infra/deploy specifics (Fly volume, SQLite backup, spend limit, cross-origin verify) — see [infra-deploy.md](./infra-deploy.md).
