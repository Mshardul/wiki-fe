# FE Auth + Sync Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing vanilla-JS frontend to the already-built `wiki-be` backend so logged-in users get auth + server-synced bookmarks / reads / recents, while anonymous users keep today's exact local-only behaviour.

**Architecture:** Cache-through (Model B) - localStorage stays the read path and source of UI truth; the API is the durable source. A new `js/api.js` module is the single wrapper for all backend calls (base-URL detection, `credentials:"include"`, error envelope → `ApiError`, global 401 handler). `state.session` holds identity in memory only (never localStorage). Sync hooks inject *inside* existing `storage.js` save functions, so existing callers (`Bookmarks.toggle`, `markRead`, `addToRecents`, …) are unchanged. Auth UI is one new modal (mirroring the existing `prefs-modal` pattern) plus one topbar login/logout button per view.

**Tech Stack:** Vanilla JS (ES6 modules, no build step), `fetch`, existing CustomEvent bus (`wiki:toast`, `wiki:themechange`), Playwright + pytest for e2e.

## Global Constraints

- **No build step, no framework, no TypeScript.** Plain ES6 modules only. (CLAUDE.md)
- **All design tokens in `tokens.css`** - never duplicate values in other CSS files. New auth modal styles reuse existing modal/topbar tokens.
- **BEM-adjacent class naming** (block-element pattern).
- **No inline styles** except dynamic values set via JS.
- **Inline `onclick` handlers require a `window.*` global** (see `app.js` WINDOW GLOBALS block). Prefer the existing `data-action` delegation in `app.js` for new static buttons.
- **Identity is NEVER cached in localStorage** - only `state.session` in memory; cookie/BE is the sole authority. (decisions/auth-integration.md → Session state)
- **Writes are fire-and-forget** - write localStorage, async POST/DELETE, do not await, swallow transient failures (`.catch(()=>{})`); load-time pull reconciles. (decisions/auth-integration.md → API client)
- **Base path is `/api/v1`.** Cookie name `session`, httpOnly (JS cannot read it).
- **Password rule (see Password policy in decisions/auth.md), all 5 must pass:** min 12 chars · ≥1 uppercase · ≥1 lowercase · ≥1 digit · ≥1 special (anything outside `[A-Za-z0-9]`). Hint set shown in UI: `! @ # $ % ^ & * ? - _`.
- **Service worker (`wiki-sw.js`) change ⇒ cache version bump.** This plan does NOT modify the SW (API calls bypass it); if that changes, bump the version.
- **Tests are e2e only** through the UI via Playwright; never test JS functions directly. Read `tests/conftest.py` before writing any test. Never add new fixtures. **Never run tests** - write correct test code; the user runs them.
- **Never commit secrets / real emails.** Test emails use `@example.com`.

## Backend contract (already built - reference, do not change)

From the Auth flow + Sync endpoints in `decisions/auth.md` (BE side already built). All JSON, base `/api/v1`. Error envelope: `{"error":{"code","message","details?}}`.

```
POST /auth/register {email,password}        → 201 | 409 dup | 400 weak-password (details=failed rules)
GET  /auth/verify?token=…                    → 302 redirect to FE home | 400
POST /auth/login {email,password}            → 200 {user:{id,email}} | 401 bad creds | 403 unverified
POST /auth/logout                            → 204
GET  /auth/me                                → 200 {user:{id,email}} | 401
POST /auth/resend-verification {email}       → 200 (generic)

GET    /bookmarks                            → 200 [{wiki_id,path,created_at}]
POST   /bookmarks      {wiki_id,path}        → 201/200 idempotent
DELETE /bookmarks      {wiki_id,path}        → 204
DELETE /bookmarks/all  {wiki_id?}            → 204
GET    /reads                                → 200 [{wiki_id,path}]
POST   /reads          {wiki_id,path}        → 201/200 idempotent
DELETE /reads          {wiki_id,path}        → 204
GET    /recents                              → 200 [{wiki_id,path,visited_at}]  ≤6 newest-first
POST   /recents        {wiki_id,path}        → 201
DELETE /recents/all    {wiki_id?}            → 204
POST   /sync/import    {bookmarks[],reads[],recents[]}  → 200 {merged counts}
```

**Shape mismatch to bridge (critical):** localStorage stores `wikiId` (camel) + derived `slug`/`title`/`wikiTitle`. BE stores only `{wiki_id, path}`. The api/sync layer converts: FE→BE drops everything but `wiki_id`+`path`; BE→FE re-derives `slug`/`title` from `path` (last segment, strip `.md`) and `wikiTitle` from `WIKIS`. Reads in localStorage are **per-wiki Sets** (`wiki-read-{wikiId}` → array of paths, no wikiId field); BE reads carry `wiki_id` explicitly.

---

## File Structure

- **Create `js/api.js`** - single backend wrapper. Base-URL detect, `credentials:"include"`, `ApiError`, `api.get/post/del`, global 401 handler, typed endpoint helpers (`api.auth.*`, `api.bookmarks.*`, `api.reads.*`, `api.recents.*`, `api.importAll`). Imports only `state.js`.
- **Create `js/auth.js`** - auth domain: `Auth` object (`init`/boot `me()`, `register`, `login`, `logout`, `resend`), password-rule validation `validatePassword(pw)`, the auth modal controller `AuthModal` (open/close/swap panels, live 5-rule checklist), and the anon→login migration prompt. Imports `api.js`, `state.js`, `storage.js`.
- **Modify `js/state.js`** - add `state.session = {user:null,status:"loading"}`.
- **Modify `js/storage.js`** - inject fire-and-forget sync writes inside `saveBookmarks`/`addToRecents`/`saveRecents`/`markRead`/`markUnread`/clear paths; add pull+merge helpers (`Sync.pullAll`, `Sync.applyServer*`) and `Sync.clearUserDataCache`. Imports `api.js` (no cycle: api imports only state).
- **Modify `js/app.js`** - import + expose `Auth`/`AuthModal` globals; boot `Auth.init()` after settings; add `data-action` cases for auth button + modal controls; wire `wiki:session-expired` listener.
- **Modify `index.html`** - add login/logout button to the 3 topbars; add the auth modal markup (mirrors `prefs-modal`).
- **Create `css/components-auth.css`** + `@import` it from `css/wiki.css` - auth modal + topbar auth button styles, using existing tokens.
- **Modify `tests/e2e/`** - add `test_auth.py` (modal, validation, login/logout flow against a mocked/stubbed BE or real local BE) and extend `test_bookmarks.py` / `test_recents.py` / `test_read_toggle.py` for the anon-unchanged invariant.

---

## Task 1: `state.session` in state.js

**Files:**
- Modify: `js/state.js:91-99` (the `state` object), `js/state.js:130-140` (exports unchanged - `state` already exported)
- Test: covered indirectly; no standalone test (pure data field)

**Interfaces:**
- Produces: `state.session = { user: null | {id,email}, status: "loading" | "in" | "out" }`. Consumed by `api.js`, `auth.js`, `storage.js`.

- [ ] **Step 1: Add the session field**

In `js/state.js`, change the `state` object (currently ends at `titleObserver: null,`):

```js
const state = {
  currentView: "home",
  currentWikiId: null,
  currentFilePath: null,
  currentTitle: null,
  indexSections: [],
  tocObserver: null,
  titleObserver: null,
  // Auth identity - in-memory only, NEVER persisted to localStorage.
  // status: "loading" until GET /auth/me resolves, then "in" | "out".
  session: { user: null, status: "loading" },
};
```

- [ ] **Step 2: Commit**

```bash
git add js/state.js
git commit -m "feat: add in-memory session state field"
```

---

## Task 2: `js/api.js` - backend wrapper + ApiError + 401 handler

**Files:**
- Create: `js/api.js`
- Test: `tests/e2e/test_auth.py` (added in Task 8; this task ships no test - it is pure infra exercised by every later task)

**Interfaces:**
- Consumes: `state` from `state.js`.
- Produces:
  - `BACKEND_URL` (string)
  - `class ApiError extends Error { code; status; }`
  - `api.get(path)`, `api.post(path, body)`, `api.del(path, body)` → parsed JSON or throws `ApiError`
  - `api.auth = { me(), register(email,pw), login(email,pw), logout(), resend(email) }`
  - `api.bookmarks = { list(), add(wiki_id,path), remove(wiki_id,path), clear(wiki_id?) }`
  - `api.reads = { list(), add(wiki_id,path), remove(wiki_id,path) }`
  - `api.recents = { list(), add(wiki_id,path), clear(wiki_id?) }`
  - `api.importAll({bookmarks,reads,recents})`
  - Fires `document` CustomEvent `wiki:session-expired` on any 401.

- [ ] **Step 1: Write `js/api.js`**

```js
import { state } from "./state.js";

/* Base URL: localhost → local BE; else prod. BE URL is public by nature
   (browser must reach it) - not a secret. Security = CORS + cookie + BE validation. */
const _isLocal =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";
const BACKEND_URL = _isLocal
  ? "http://localhost:8001"
  : "https://wiki-be.fly.dev"; // matches BE prod host; update when custom domain bought
const API = `${BACKEND_URL}/api/v1`;

class ApiError extends Error {
  constructor(code, message, status) {
    super(message || code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

let _sessionExpiredFired = false;

async function _request(method, path, body) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError("NETWORK", networkErr.message, 0);
  }

  if (res.status === 401) {
    // Global staleness handler (Option A): flip session, prompt re-login once.
    if (!_sessionExpiredFired) {
      _sessionExpiredFired = true;
      state.session = { user: null, status: "out" };
      document.dispatchEvent(new CustomEvent("wiki:session-expired"));
      // allow future 401s to fire again after the user re-auths
      setTimeout(() => (_sessionExpiredFired = false), 0);
    }
    throw new ApiError("UNAUTHORIZED", "Session expired", 401);
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const env = data?.error || {};
    throw new ApiError(
      env.code || "ERROR",
      env.message || res.statusText,
      res.status
    );
  }
  return data;
}

const api = {
  get: (p) => _request("GET", p),
  post: (p, b) => _request("POST", p, b),
  del: (p, b) => _request("DELETE", p, b),

  auth: {
    me: () => api.get("/auth/me"),
    register: (email, password) =>
      api.post("/auth/register", { email, password }),
    login: (email, password) => api.post("/auth/login", { email, password }),
    logout: () => api.post("/auth/logout"),
    resend: (email) => api.post("/auth/resend-verification", { email }),
  },
  bookmarks: {
    list: () => api.get("/bookmarks"),
    add: (wiki_id, path) => api.post("/bookmarks", { wiki_id, path }),
    remove: (wiki_id, path) => api.del("/bookmarks", { wiki_id, path }),
    clear: (wiki_id) =>
      api.del("/bookmarks/all", wiki_id ? { wiki_id } : {}),
  },
  reads: {
    list: () => api.get("/reads"),
    add: (wiki_id, path) => api.post("/reads", { wiki_id, path }),
    remove: (wiki_id, path) => api.del("/reads", { wiki_id, path }),
  },
  recents: {
    list: () => api.get("/recents"),
    add: (wiki_id, path) => api.post("/recents", { wiki_id, path }),
    clear: (wiki_id) =>
      api.del("/recents/all", wiki_id ? { wiki_id } : {}),
  },
  importAll: (payload) => api.post("/sync/import", payload),
};

export { api, ApiError, BACKEND_URL };
```

- [ ] **Step 2: Commit**

```bash
git add js/api.js
git commit -m "feat: add api.js backend wrapper with ApiError and 401 handler"
```

---

## Task 3: Sync layer in storage.js (writes + pull/merge)

Inject fire-and-forget BE writes inside existing save functions, plus a `Sync` object for boot/login pull. Anon path (status !== "in") must be byte-for-byte today's behaviour.

**Files:**
- Modify: `js/storage.js` - top import; `saveBookmarks` (line ~44), `Bookmarks.clearAll`/`clearWiki` (~131-139), `addToRecents` (~156), `clearRecents` (~167), `markRead` (~221), `markUnread` (~233); add `Sync` object before exports; extend export list (~1044).
- Test: `tests/e2e/test_bookmarks.py`, `test_recents.py`, `test_read_toggle.py` (Task 9 - anon-unchanged invariant).

**Interfaces:**
- Consumes: `api` from `js/api.js`; `state.session`, `WIKIS`.
- Produces:
  - `Sync.pullAll()` → fetch all 3 lists, overwrite localStorage with server truth, return nothing (caller re-renders).
  - `Sync.clearUserDataCache()` → remove `wiki-bookmarks`, `wiki-recents`, all `wiki-read-{id}` keys.
  - `Sync.flushBestEffort()` → no-op placeholder returning `Promise.resolve()` (fire-and-forget means little is unsynced; logout calls it with a short timeout).
  - Private `_loggedIn()` helper → `state.session.status === "in"`.
  - Private `_deriveBookmark(wiki_id, path)` / `_deriveRecent(...)` → rebuild FE-shaped objects from BE rows.

- [ ] **Step 1: Add import + helpers at top of storage.js**

Change the first import line and add helpers right after the `_toast` function (after line 7):

```js
import { state, WIKIS, escHtml } from "./state.js";
import { api } from "./api.js";
```

Then after `_toast` (after line 7), add:

```js
/* ═══════════════════════════════════════════════════════════════
   BACKEND SYNC (cache-through / Model B)
   Anon users (status !== "in") never hit these paths.
   ═══════════════════════════════════════════════════════════════ */
function _loggedIn() {
  return state.session?.status === "in";
}

function _titleFromPath(path) {
  return path.split("/").pop().replace(/\.md$/, "");
}

function _deriveBookmark(wikiId, path) {
  const wiki = WIKIS.find((w) => w.id === wikiId);
  const name = _titleFromPath(path);
  return { wikiId, path, slug: name, title: name, wikiTitle: wiki?.title || "" };
}

function _deriveRecent(wikiId, path) {
  const wiki = WIKIS.find((w) => w.id === wikiId);
  const name = _titleFromPath(path);
  return { wikiId, path, slug: name, title: name, wikiTitle: wiki?.title || "" };
}
```

- [ ] **Step 2: Hook bookmark writes**

Replace `saveBookmarks` (currently lines 44-46) with a version that diffs against prior state and fires BE calls. Because callers pass the full new array, compute add/remove by comparing to the previous stored array:

```js
function saveBookmarks(arr) {
  if (_loggedIn()) {
    const prev = getBookmarks();
    const prevKeys = new Set(prev.map((b) => `${b.wikiId}|${b.path}`));
    const nextKeys = new Set(arr.map((b) => `${b.wikiId}|${b.path}`));
    for (const b of arr) {
      if (!prevKeys.has(`${b.wikiId}|${b.path}`)) {
        api.bookmarks.add(b.wikiId, b.path).catch(() => {});
      }
    }
    for (const b of prev) {
      if (!nextKeys.has(`${b.wikiId}|${b.path}`)) {
        api.bookmarks.remove(b.wikiId, b.path).catch(() => {});
      }
    }
  }
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
}
```

Note `BOOKMARKS_KEY` is defined at line 34, before `saveBookmarks` - order is fine.

- [ ] **Step 3: Hook bookmark clears**

In `Bookmarks.clearAll` (line ~131), add a BE clear-all before/after the local clear:

```js
  clearAll() {
    if (_loggedIn()) api.bookmarks.clear().catch(() => {});
    saveBookmarks([]);
    const wiki = WIKIS.find((w) => w.id === state.currentWikiId);
    if (wiki) renderBookmarksSection(wiki);
  },
```

In `Bookmarks.clearWiki(wikiId)` (line ~136):

```js
  clearWiki(wikiId) {
    if (_loggedIn()) api.bookmarks.clear(wikiId).catch(() => {});
    saveBookmarks(getBookmarks().filter((b) => b.wikiId !== wikiId));
    document.getElementById("bookmarks-section")?.classList.add("hidden");
  },
```

Caution: `saveBookmarks` here will *also* diff and try to remove the cleared rows individually. To avoid double-fire, guard `saveBookmarks`'s diff when a clear is in flight is overkill; instead, in `clearWiki`/`clearAll` write localStorage directly to skip the diff:

```js
  clearAll() {
    if (_loggedIn()) api.bookmarks.clear().catch(() => {});
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([]));
    const wiki = WIKIS.find((w) => w.id === state.currentWikiId);
    if (wiki) renderBookmarksSection(wiki);
  },
  clearWiki(wikiId) {
    if (_loggedIn()) api.bookmarks.clear(wikiId).catch(() => {});
    localStorage.setItem(
      BOOKMARKS_KEY,
      JSON.stringify(getBookmarks().filter((b) => b.wikiId !== wikiId))
    );
    document.getElementById("bookmarks-section")?.classList.add("hidden");
  },
```

- [ ] **Step 4: Hook recents writes**

In `addToRecents` (line ~156):

```js
function addToRecents(entry) {
  let recents = getRecents().filter((r) => r.path !== entry.path);
  recents.unshift(entry);
  if (recents.length > RECENTS_MAX) recents = recents.slice(0, RECENTS_MAX);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  if (_loggedIn()) api.recents.add(entry.wikiId, entry.path).catch(() => {});
}
```

In `clearRecents(wikiId)` (line ~167):

```js
function clearRecents(wikiId) {
  if (_loggedIn()) api.recents.clear(wikiId).catch(() => {});
  const remaining = getRecents().filter((r) => r.wikiId !== wikiId);
  saveRecents(remaining);
  document.getElementById("recents-section")?.classList.add("hidden");
}
```

(`saveRecents` is a plain setter - leave it unhooked to avoid double-fire; recents writes go only through `addToRecents`/`clearRecents`.)

- [ ] **Step 5: Hook reads**

In `markRead(path)` (line ~221) add the BE call after the localStorage write (inside the function, after `localStorage.setItem(_readKey(), …)`):

```js
function markRead(path) {
  const read = getReadSet();
  if (read.has(path)) return;
  read.add(path);
  localStorage.setItem(_readKey(), JSON.stringify([...read]));
  if (_loggedIn()) api.reads.add(state.currentWikiId, path).catch(() => {});
  document.querySelectorAll(`.index-card-read-dot`).forEach((dot) => {
    const card = dot.closest(".index-card");
    const timeBadge = card?.querySelector(".index-card-read-time");
    if (timeBadge?.dataset.path === path) dot.classList.add("visible");
  });
}
```

In `markUnread(path)` (line ~233):

```js
function markUnread(path) {
  const read = getReadSet();
  if (!read.has(path)) return;
  read.delete(path);
  localStorage.setItem(_readKey(), JSON.stringify([...read]));
  if (_loggedIn()) api.reads.remove(state.currentWikiId, path).catch(() => {});
  document.querySelectorAll(`.index-card-read-dot`).forEach((dot) => {
    const card = dot.closest(".index-card");
    const timeBadge = card?.querySelector(".index-card-read-time");
    if (timeBadge?.dataset.path === path) dot.classList.remove("visible");
  });
}
```

Note: `markRead`/`markUnread` use `state.currentWikiId` for `wiki_id` because reads localStorage is keyed per-wiki and carries no wikiId field. This is correct only while the read is for the current wiki - which is always true (reads are toggled from the current article/index). Document this assumption in a one-line comment above each `api.reads` call:

```js
  // reads are always for the current wiki (per-wiki localStorage key); safe to use currentWikiId
```

- [ ] **Step 6: Add the `Sync` object**

Before the `export {` block (line ~1044), add:

```js
/* ═══════════════════════════════════════════════════════════════
   SYNC - pull/merge on login & boot; cache clear on logout
   ═══════════════════════════════════════════════════════════════ */
const Sync = {
  // Pull all server lists and overwrite localStorage with server truth.
  async pullAll() {
    const [bm, rd, rc] = await Promise.all([
      api.bookmarks.list().catch(() => []),
      api.reads.list().catch(() => []),
      api.recents.list().catch(() => []),
    ]);

    // Bookmarks → FE shape (newest server order preserved as returned)
    localStorage.setItem(
      BOOKMARKS_KEY,
      JSON.stringify((bm || []).map((r) => _deriveBookmark(r.wiki_id, r.path)))
    );

    // Reads → per-wiki Sets
    const byWiki = {};
    for (const r of rd || []) {
      (byWiki[r.wiki_id] ||= new Set()).add(r.path);
    }
    for (const wiki of WIKIS) {
      const set = byWiki[wiki.id];
      if (set) {
        localStorage.setItem(`wiki-read-${wiki.id}`, JSON.stringify([...set]));
      } else {
        localStorage.removeItem(`wiki-read-${wiki.id}`);
      }
    }

    // Recents → FE shape, ≤6 (BE already trims; respect server order)
    localStorage.setItem(
      RECENTS_KEY,
      JSON.stringify(
        (rc || []).slice(0, RECENTS_MAX).map((r) => _deriveRecent(r.wiki_id, r.path))
      )
    );
  },

  clearUserDataCache() {
    localStorage.removeItem(BOOKMARKS_KEY);
    localStorage.removeItem(RECENTS_KEY);
    for (const wiki of WIKIS) localStorage.removeItem(`wiki-read-${wiki.id}`);
  },

  // Logout B-lite flush. Fire-and-forget writes already synced per-action,
  // so this is effectively a no-op safety net; returns immediately.
  flushBestEffort() {
    return Promise.resolve();
  },
};
```

- [ ] **Step 7: Export the new symbols**

In the `export {` block at the bottom, add `Sync` (and nothing else new - `_deriveBookmark` etc. stay private):

```js
  Theme,
  Sync,
};
```

- [ ] **Step 8: Commit**

```bash
git add js/storage.js
git commit -m "feat: cache-through backend sync hooks in storage layer"
```

---

## Task 4: Password validation + `validatePassword`

**Files:**
- Create part of: `js/auth.js` (this task creates the file with only the validation export; later tasks append).
- Test: `tests/e2e/test_auth.py` (Task 8 covers the live checklist via UI).

**Interfaces:**
- Produces: `validatePassword(pw)` → `{ valid: boolean, rules: [{id,label,ok}] }` with rule ids `len`,`upper`,`lower`,`digit`,`special` in display order.

- [ ] **Step 1: Create `js/auth.js` with validation**

```js
import { api, ApiError } from "./api.js";
import { state } from "./state.js";
import { Sync } from "./storage.js";

/* ═══════════════════════════════════════════════════════════════
   PASSWORD POLICY - mirrors wiki-be; keep in sync via decisions/auth.md
   ═══════════════════════════════════════════════════════════════ */
const PW_RULES = [
  { id: "len", label: "At least 12 characters", test: (p) => p.length >= 12 },
  { id: "upper", label: "An uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "A number (0–9)", test: (p) => /[0-9]/.test(p) },
  {
    id: "special",
    label: "A special character ( ! @ # $ % ^ & * ? - _ )",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

function validatePassword(pw) {
  const rules = PW_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(pw) }));
  return { valid: rules.every((r) => r.ok), rules };
}

export { validatePassword, PW_RULES };
```

- [ ] **Step 2: Commit**

```bash
git add js/auth.js
git commit -m "feat: password policy validation matching backend rules"
```

---

## Task 5: Auth modal markup + styles

**Files:**
- Modify: `index.html` - add auth modal block near `prefs-modal` (after line ~480 region; place the new modal right after the prefs modal closes). Add a login/logout button to each of the 3 topbars (home line ~153, index line ~228, content topbar line ~248 region).
- Create: `css/components-auth.css`
- Modify: `css/wiki.css` - add `@import "components-auth.css";`
- Test: none (markup/CSS; behaviour tested in Task 8).

**Interfaces:**
- Produces DOM ids consumed by `AuthModal` (Task 6): `auth-modal`, `auth-backdrop`, `auth-close`, panels `auth-panel-login`, `auth-panel-register`, `auth-panel-verify`, inputs `auth-login-email`,`auth-login-password`,`auth-reg-email`,`auth-reg-password`, checklist `auth-pw-checklist`, submit buttons `auth-login-submit`,`auth-reg-submit`, swap links `auth-to-register`,`auth-to-login`, resend `auth-resend-btn`, error slots `auth-login-error`,`auth-reg-error`. Topbar buttons carry `data-action="auth-toggle"` and class `topbar-auth-btn` with id `auth-btn-<view>` (home/index/content) and a `.auth-btn-label` span.

- [ ] **Step 1: Add the login/logout button to each topbar**

Home topbar - after the preferences button (before `</div>` at line ~154):

```html
        <button
          class="topbar-icon-btn topbar-auth-btn"
          id="auth-btn-home"
          data-action="auth-toggle"
          title="Login"
        >
          <span class="auth-btn-label">Login</span>
        </button>
```

Index topbar - same markup with `id="auth-btn-index"`, inserted after the preferences button (line ~228). Content topbar - `id="auth-btn-content"`, inserted into the `.topbar-inner` action group near the other `topbar-icon-btn`s (around line ~377). Keep all three identical except the id.

- [ ] **Step 2: Add the auth modal markup**

Immediately after the `prefs-modal` closing markup, add (mirrors prefs-modal structure: backdrop + dialog):

```html
    <!-- ══════════════════════════════════════
       AUTH MODAL - login / register / verify-pending
  ══════════════════════════════════════ -->
    <div id="auth-modal" class="auth-modal hidden" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Account">
      <div id="auth-backdrop" class="auth-backdrop"></div>
      <div class="auth-dialog">
        <button id="auth-close" class="auth-close" data-action="auth-close" aria-label="Close">✕</button>

        <!-- LOGIN -->
        <div id="auth-panel-login" class="auth-panel active">
          <h2 class="auth-title">Log in</h2>
          <label class="auth-field"><span>Email</span>
            <input id="auth-login-email" type="email" autocomplete="email" />
          </label>
          <label class="auth-field"><span>Password</span>
            <input id="auth-login-password" type="password" autocomplete="current-password" />
          </label>
          <p id="auth-login-error" class="auth-error" hidden></p>
          <button id="auth-login-submit" class="auth-submit">Log in</button>
          <p class="auth-swap">No account?
            <button id="auth-to-register" class="auth-link" type="button">Register</button>
          </p>
        </div>

        <!-- REGISTER -->
        <div id="auth-panel-register" class="auth-panel">
          <h2 class="auth-title">Create account</h2>
          <label class="auth-field"><span>Email</span>
            <input id="auth-reg-email" type="email" autocomplete="email" />
          </label>
          <label class="auth-field"><span>Password</span>
            <input id="auth-reg-password" type="password" autocomplete="new-password" />
          </label>
          <ul id="auth-pw-checklist" class="auth-pw-checklist" aria-live="polite"></ul>
          <p id="auth-reg-error" class="auth-error" hidden></p>
          <button id="auth-reg-submit" class="auth-submit" disabled>Create account</button>
          <p class="auth-swap">Have an account?
            <button id="auth-to-login" class="auth-link" type="button">Log in</button>
          </p>
        </div>

        <!-- VERIFY PENDING -->
        <div id="auth-panel-verify" class="auth-panel">
          <h2 class="auth-title">Check your email</h2>
          <p class="auth-verify-copy">We sent a verification link to your inbox. Click it to finish signing up.</p>
          <button id="auth-resend-btn" class="auth-submit">Resend email</button>
          <p class="auth-swap">
            <button id="auth-to-login" class="auth-link" type="button">Back to log in</button>
          </p>
        </div>
      </div>
    </div>
```

(Note: the verify panel reuses id `auth-to-login`; ids must be unique - rename the verify-panel one to `auth-verify-to-login` and handle both in Task 6.)

- [ ] **Step 3: Create `css/components-auth.css`**

```css
/* Auth modal + topbar auth button. Tokens only - see tokens.css. */
.auth-modal.hidden { display: none; }
.auth-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}
.auth-dialog {
  position: relative;
  width: min(420px, calc(100vw - 2rem));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  padding: 1.75rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}
.auth-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  color: var(--text-body);
  cursor: pointer;
  font-size: 1rem;
}
.auth-panel { display: none; }
.auth-panel.active { display: block; }
.auth-title {
  margin: 0 0 1.25rem;
  color: var(--text-heading);
  font-size: 1.25rem;
}
.auth-field {
  display: block;
  margin-bottom: 1rem;
}
.auth-field > span {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--text-body);
  font-size: 0.85rem;
}
.auth-field input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius, 8px);
  color: var(--text-heading);
  font: inherit;
}
.auth-field input:focus {
  outline: none;
  border-color: var(--accent);
}
.auth-pw-checklist {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  font-size: 0.8rem;
}
.auth-pw-checklist li {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--text-body);
  margin-bottom: 0.25rem;
}
.auth-pw-checklist li::before {
  content: "✗";
  color: #e5484d;
  font-weight: 700;
}
.auth-pw-checklist li.ok::before {
  content: "✓";
  color: var(--accent);
}
.auth-error {
  color: #e5484d;
  font-size: 0.8rem;
  margin: 0 0 0.75rem;
}
.auth-submit {
  width: 100%;
  padding: 0.7rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius, 8px);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.auth-swap {
  margin: 1rem 0 0;
  text-align: center;
  color: var(--text-body);
  font-size: 0.85rem;
}
.auth-link {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
}
.topbar-auth-btn { width: auto; padding: 0 0.75rem; }
.auth-btn-label { font-size: 0.85rem; font-weight: 600; }
```

- [ ] **Step 4: Import the CSS**

In `css/wiki.css`, add alongside the other `@import` lines:

```css
@import "components-auth.css";
```

- [ ] **Step 5: Commit**

```bash
git add index.html css/components-auth.css css/wiki.css
git commit -m "feat: auth modal markup and styles, topbar auth buttons"
```

---

## Task 6: AuthModal controller + Auth flows in auth.js

**Files:**
- Modify: `js/auth.js` (append `AuthModal` + `Auth`).
- Test: `tests/e2e/test_auth.py` (Task 8).

**Interfaces:**
- Consumes: `validatePassword` (Task 4), `api`/`ApiError` (Task 2), `state` (Task 1), `Sync` (Task 3).
- Produces:
  - `Auth = { init(), login(email,pw), register(email,pw), logout(), resend(email), refreshButtons() }`
  - `AuthModal = { open(panel="login"), close(), _swap(panel), _renderChecklist() }`
  - On successful login, runs migration prompt (Task 7's `maybeMigrate`) then `Sync.pullAll()` then re-render.

- [ ] **Step 1: Append AuthModal + Auth to `js/auth.js`**

```js
/* ═══════════════════════════════════════════════════════════════
   AUTH MODAL CONTROLLER
   ═══════════════════════════════════════════════════════════════ */
const AuthModal = {
  _lastFocus: null,

  open(panel = "login") {
    this._lastFocus = document.activeElement;
    const m = document.getElementById("auth-modal");
    m.classList.remove("hidden");
    m.setAttribute("aria-hidden", "false");
    this._swap(panel);
  },

  close() {
    const m = document.getElementById("auth-modal");
    m.classList.add("hidden");
    m.setAttribute("aria-hidden", "true");
    this._clearErrors();
    if (this._lastFocus?.focus) this._lastFocus.focus();
  },

  isOpen() {
    return !document.getElementById("auth-modal").classList.contains("hidden");
  },

  _swap(panel) {
    document.querySelectorAll(".auth-panel").forEach((p) => {
      p.classList.toggle("active", p.id === `auth-panel-${panel}`);
    });
    this._clearErrors();
    if (panel === "register") this._renderChecklist("");
    const focusId =
      panel === "login"
        ? "auth-login-email"
        : panel === "register"
        ? "auth-reg-email"
        : "auth-resend-btn";
    document.getElementById(focusId)?.focus();
  },

  _renderChecklist(pw) {
    const { rules } = validatePassword(pw);
    const ul = document.getElementById("auth-pw-checklist");
    if (!ul) return;
    ul.innerHTML = rules
      .map((r) => `<li class="${r.ok ? "ok" : ""}">${r.label}</li>`)
      .join("");
  },

  _clearErrors() {
    ["auth-login-error", "auth-reg-error"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.hidden = true;
        el.textContent = "";
      }
    });
  },

  _showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.hidden = false;
    }
  },
};

/* ═══════════════════════════════════════════════════════════════
   AUTH - boot + flows
   ═══════════════════════════════════════════════════════════════ */
const Auth = {
  // Called once on app boot (real page load only). One GET /auth/me.
  async init() {
    try {
      const data = await api.auth.me();
      state.session = { user: data.user, status: "in" };
      await Sync.pullAll();
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
    } catch {
      state.session = { user: null, status: "out" };
    }
    this.refreshButtons();
    this._wireModalInputs();
  },

  refreshButtons() {
    const loggedIn = state.session.status === "in";
    document
      .querySelectorAll(".topbar-auth-btn .auth-btn-label")
      .forEach((el) => (el.textContent = loggedIn ? "Logout" : "Login"));
    document
      .querySelectorAll(".topbar-auth-btn")
      .forEach((b) => (b.title = loggedIn ? "Logout" : "Login"));
  },

  // Topbar button handler.
  toggle() {
    if (state.session.status === "in") {
      this.logout();
    } else {
      AuthModal.open("login");
    }
  },

  async login(email, password) {
    try {
      const data = await api.auth.login(email, password);
      state.session = { user: data.user, status: "in" };
      AuthModal.close();
      this.refreshButtons();
      // migration prompt (Task 7) then pull server truth
      await maybeMigrate();
      await Sync.pullAll();
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        AuthModal._swap("verify");
      } else {
        AuthModal._showError(
          "auth-login-error",
          e instanceof ApiError ? e.message : "Login failed"
        );
      }
    }
  },

  async register(email, password) {
    const { valid } = validatePassword(password);
    if (!valid) {
      AuthModal._showError("auth-reg-error", "Password does not meet all rules.");
      return;
    }
    try {
      await api.auth.register(email, password);
      AuthModal._swap("verify");
    } catch (e) {
      AuthModal._showError(
        "auth-reg-error",
        e instanceof ApiError ? e.message : "Registration failed"
      );
    }
  },

  async resend(email) {
    try {
      await api.auth.resend(email);
    } catch {
      /* generic 200 either way; ignore */
    }
  },

  async logout() {
    // B-lite: best-effort flush, then clear + logout regardless of result.
    await Sync.flushBestEffort().catch(() => {});
    await api.auth.logout().catch(() => {});
    state.session = { user: null, status: "out" };
    Sync.clearUserDataCache();
    this.refreshButtons();
    document.dispatchEvent(new CustomEvent("wiki:session-changed"));
  },

  _wireModalInputs() {
    // live checklist
    const pw = document.getElementById("auth-reg-password");
    const submit = document.getElementById("auth-reg-submit");
    pw?.addEventListener("input", () => {
      AuthModal._renderChecklist(pw.value);
      if (submit) submit.disabled = !validatePassword(pw.value).valid;
    });
    // submit handlers
    document
      .getElementById("auth-login-submit")
      ?.addEventListener("click", () =>
        this.login(
          document.getElementById("auth-login-email").value.trim(),
          document.getElementById("auth-login-password").value
        )
      );
    document
      .getElementById("auth-reg-submit")
      ?.addEventListener("click", () =>
        this.register(
          document.getElementById("auth-reg-email").value.trim(),
          document.getElementById("auth-reg-password").value
        )
      );
    document
      .getElementById("auth-resend-btn")
      ?.addEventListener("click", () =>
        this.resend(document.getElementById("auth-reg-email").value.trim())
      );
    // panel swaps
    document
      .getElementById("auth-to-register")
      ?.addEventListener("click", () => AuthModal._swap("register"));
    document
      .getElementById("auth-to-login")
      ?.addEventListener("click", () => AuthModal._swap("login"));
    document
      .getElementById("auth-verify-to-login")
      ?.addEventListener("click", () => AuthModal._swap("login"));
  },
};

export { AuthModal, Auth };
```

- [ ] **Step 2: Commit**

```bash
git add js/auth.js
git commit -m "feat: auth modal controller and login/register/logout flows"
```

---

## Task 7: Anon→login migration prompt

**Files:**
- Modify: `js/auth.js` - add `maybeMigrate()` (referenced by `Auth.login` in Task 6; define it before `Auth` or hoist via function declaration). Use a function declaration so order doesn't matter.
- Test: `tests/e2e/test_auth.py` (Task 8).

**Interfaces:**
- Consumes: `api.importAll`, `getBookmarks`/`getRecents`/`getReadSet` from storage, `WIKIS`.
- Produces: `async function maybeMigrate()` → if local anon data exists, shows one keep/discard prompt; Keep → `POST /sync/import`; Discard → drop local. Resolves either way (never blocks login). The subsequent `Sync.pullAll()` (in `Auth.login`) provides server truth.

- [ ] **Step 1: Import storage readers in auth.js**

Extend the storage import at the top of `js/auth.js`:

```js
import { Sync, getBookmarks, getRecents } from "./storage.js";
import { WIKIS } from "./state.js";
```

(`state` is already imported; add `WIKIS` to that import line instead if cleaner. Reads are gathered directly from localStorage keys to avoid `_readKey` coupling.)

- [ ] **Step 2: Add `maybeMigrate` (function declaration, hoisted)**

```js
function _collectLocalReads() {
  const out = [];
  for (const wiki of WIKIS) {
    let arr = [];
    try {
      arr = JSON.parse(localStorage.getItem(`wiki-read-${wiki.id}`) || "[]");
    } catch {
      arr = [];
    }
    for (const path of arr) out.push({ wiki_id: wiki.id, path });
  }
  return out;
}

function _hasLocalData() {
  const bm = getBookmarks();
  const rc = getRecents();
  const rd = _collectLocalReads();
  return bm.length > 0 || rc.length > 0 || rd.length > 0;
}

// One prompt on login if local anon data exists. Never blocks login.
async function maybeMigrate() {
  if (!_hasLocalData()) return;

  const keep = await new Promise((resolve) => {
    document.dispatchEvent(
      new CustomEvent("wiki:toast", {
        detail: {
          message:
            "You have unsaved items on this device from browsing signed out. Keep them in your account?",
          durationMs: 12000,
          onUndo: () => resolve(true), // "Keep them" maps to the action button
        },
      })
    );
    // If the toast expires without action, treat as discard.
    setTimeout(() => resolve(false), 12500);
  });

  if (keep) {
    const payload = {
      bookmarks: getBookmarks().map((b) => ({ wiki_id: b.wikiId, path: b.path })),
      reads: _collectLocalReads(),
      recents: getRecents().map((r) => ({ wiki_id: r.wikiId, path: r.path })),
    };
    await api.importAll(payload).catch(() => {});
  } else {
    Sync.clearUserDataCache();
  }
}
```

Note: the existing toast supports a single action via `onUndo` (label "Undo" in render.js). For correct copy ("Keep them"/"Discard"), Task 8's self-review may upgrade the toast to accept a custom action label; if not done, the Undo button acts as "Keep them" and expiry acts as "Discard". Keep this behaviour explicit in the test.

- [ ] **Step 3: Commit**

```bash
git add js/auth.js
git commit -m "feat: anon-to-login data migration prompt"
```

---

## Task 8: Wire Auth into app.js (boot, globals, events)

**Files:**
- Modify: `js/app.js` - imports, window globals, `data-action` cases, boot call, session-expired listener, session-changed re-render.
- Test: `tests/e2e/test_auth.py` (Task 9 writes the suite).

**Interfaces:**
- Consumes: `Auth`, `AuthModal` from `js/auth.js`; existing `route`/render helpers.
- Produces: app boots session, topbar buttons work, 401 reopens login modal with toast.

- [ ] **Step 1: Add imports**

After the existing imports in `app.js`:

```js
import { Auth, AuthModal } from "./auth.js";
```

- [ ] **Step 2: Expose globals**

In the WINDOW GLOBALS block:

```js
window.Auth = Auth;
window.AuthModal = AuthModal;
```

- [ ] **Step 3: Add data-action cases**

In the `data-action` switch (the `document.addEventListener("click", …)` block), add:

```js
    case "auth-toggle":
      Auth.toggle();
      break;
    case "auth-close":
      AuthModal.close();
      break;
```

- [ ] **Step 4: Wire session events + 401**

After the `wiki:toast` listener, add:

```js
document.addEventListener("wiki:session-expired", () => {
  Auth.refreshButtons();
  showToast("Session expired, please log in", 5000);
  AuthModal.open("login");
});

document.addEventListener("wiki:session-changed", () => {
  // re-render current view so synced data appears
  route(location.hash.slice(1));
});
```

- [ ] **Step 5: Boot Auth in init()**

In the `init()` IIFE, after `applySettingsToDOM(getSettings());` and before `route(hash)`, add:

```js
  Auth.init(); // async; fires GET /auth/me, pulls data, refreshes UI when done
```

Auth.init is intentionally not awaited - boot/render proceeds anonymously and re-renders on `wiki:session-changed`.

- [ ] **Step 6: Add Escape handling for the auth modal**

In the global `keydown` Escape branch, add `AuthModal` before the Settings check:

```js
  if (e.key === "Escape") {
    if (document.getElementById("zoom-overlay")?.classList.contains("open")) {
      closeZoomOverlay();
    } else if (AuthModal.isOpen()) {
      AuthModal.close();
    } else if (
```

- [ ] **Step 7: Wire the auth backdrop click**

After the `prefs-backdrop` listener:

```js
document
  .getElementById("auth-backdrop")
  .addEventListener("click", () => AuthModal.close());
```

- [ ] **Step 8: Commit**

```bash
git add js/app.js
git commit -m "feat: boot auth, wire auth events and 401 re-login"
```

---

## Task 9: e2e tests

**Files:**
- Read first: `tests/conftest.py` (fixtures, server, nav helpers).
- Create: `tests/e2e/test_auth.py`.
- Modify: `tests/e2e/test_bookmarks.py`, `tests/e2e/test_recents.py`, `tests/e2e/test_read_toggle.py` - add one "anon behaviour unchanged" assertion each (no network call when logged out).

**Interfaces:**
- Consumes: existing conftest fixtures. BE is not assumed running in CI; stub `fetch` via `page.route("**/api/v1/**", …)` to fulfil mock responses.

- [ ] **Step 1: Read conftest**

Run: open `tests/conftest.py`, note the page/server fixtures and navigation helpers. Do not add new fixtures.

- [ ] **Step 2: Write `test_auth.py` - modal opens + register checklist goes green**

```python
def test_auth_modal_opens_from_topbar(page, base_url):
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    expect(page.locator("#auth-modal")).not_to_have_class(re.compile(r"\bhidden\b"))
    expect(page.locator("#auth-panel-login.active")).to_be_visible()


def test_register_checklist_turns_green(page, base_url):
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-to-register").click()
    pw = page.locator("#auth-reg-password")
    pw.fill("short")
    # not all rules satisfied -> submit disabled
    expect(page.locator("#auth-reg-submit")).to_be_disabled()
    pw.fill("LongEnough1!xx")
    # all 5 rules pass -> every li has class ok, submit enabled
    items = page.locator("#auth-pw-checklist li")
    expect(items).to_have_count(5)
    for i in range(5):
        expect(items.nth(i)).to_have_class(re.compile(r"\bok\b"))
    expect(page.locator("#auth-reg-submit")).to_be_enabled()
```

- [ ] **Step 3: Write `test_auth.py` - login success via mocked BE**

```python
def test_login_success_flips_button_to_logout(page, base_url):
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(status=401, content_type="application/json",
                            body='{"error":{"code":"UNAUTHORIZED","message":"no session"}}'),
    )
    page.route(
        "**/api/v1/auth/login",
        lambda r: r.fulfill(status=200, content_type="application/json",
                            body='{"user":{"id":1,"email":"a@example.com"}}'),
    )
    for path in ("bookmarks", "reads", "recents"):
        page.route(f"**/api/v1/{path}",
                   lambda r: r.fulfill(status=200, content_type="application/json", body="[]"))
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()
    expect(page.locator("#auth-btn-home .auth-btn-label")).to_have_text("Logout")
```

- [ ] **Step 4: Write `test_auth.py` - unverified login shows verify panel**

```python
def test_login_unverified_shows_verify_panel(page, base_url):
    page.route("**/api/v1/auth/me",
               lambda r: r.fulfill(status=401, content_type="application/json",
                                   body='{"error":{"code":"UNAUTHORIZED","message":"x"}}'))
    page.route("**/api/v1/auth/login",
               lambda r: r.fulfill(status=403, content_type="application/json",
                                   body='{"error":{"code":"UNVERIFIED","message":"verify first"}}'))
    page.goto(base_url)
    page.locator("#auth-btn-home").click()
    page.locator("#auth-login-email").fill("a@example.com")
    page.locator("#auth-login-password").fill("LongEnough1!xx")
    page.locator("#auth-login-submit").click()
    expect(page.locator("#auth-panel-verify.active")).to_be_visible()
```

- [ ] **Step 5: Anon-unchanged invariant in bookmarks test**

Add to `tests/e2e/test_bookmarks.py`:

```python
def test_anon_bookmark_makes_no_api_call(page, base_url):
    calls = []
    page.route("**/api/v1/**", lambda r: (calls.append(r.request.url), r.abort()))
    page.route("**/api/v1/auth/me",
               lambda r: r.fulfill(status=401, content_type="application/json",
                                   body='{"error":{"code":"UNAUTHORIZED","message":"x"}}'))
    page.goto(base_url)
    # navigate to an article and bookmark it (reuse existing nav helper pattern in this file)
    # ... open first article, click #content-bookmark-btn ...
    # only the auth/me probe is allowed; no bookmark POST
    assert all("/bookmarks" not in u for u in calls)
```

(Match the file's existing navigation idiom for opening an article; do not invent new fixtures.)

- [ ] **Step 6: Mirror the anon-unchanged test in recents + reads**

Add the analogous `test_anon_*_makes_no_api_call` to `test_recents.py` (assert no `/recents` POST) and `test_read_toggle.py` (assert no `/reads` POST), following each file's existing navigation idiom.

- [ ] **Step 7: Add the `import re` / `from playwright.sync_api import expect` lines**

Ensure each touched test file has, at the top (only if missing):

```python
import re
from playwright.sync_api import expect
```

- [ ] **Step 8: Commit**

```bash
git add tests/e2e/test_auth.py tests/e2e/test_bookmarks.py tests/e2e/test_recents.py tests/e2e/test_read_toggle.py
git commit -m "test: e2e coverage for auth modal, login flow, anon-unchanged invariant"
```

---

## Task 10: Update FE CLAUDE.md file map

**Files:**
- Modify: `CLAUDE.md` (FE) - add `js/api.js` and `js/auth.js` to the JS file map; add `css/components-auth.css` to the CSS map; add `tests/e2e/test_auth.py` to the test map; add an "Auth/sync bug" row to TASK → FILE ROUTING.
- Test: none (docs).

- [ ] **Step 1: Add the JS rows**

In the JS table:

```markdown
| `api.js`     | Single wrapper for all backend (`wiki-be`) calls: base-URL detect, credentials, `ApiError`, global 401 handler, typed endpoint helpers |
| `auth.js`    | Auth domain: password-rule validation, auth modal controller (login/register/verify panels), login/register/logout/resend flows, anon→login migration |
```

- [ ] **Step 2: Add CSS + test + routing rows**

CSS map:

```markdown
| `components-auth.css` | Auth modal + topbar auth button styles (tokens only)                                                |
```

Test map:

```markdown
| `e2e/test_auth.py`                      | Auth modal, password checklist, login/register/verify, anon-unchanged invariant |
```

TASK → FILE ROUTING:

```markdown
| Auth / sync bug           | `js/api.js`, `js/auth.js`, `js/storage.js`, `js/state.js`                                       |
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add auth/sync modules to FE file map"
```

---

## Self-Review notes (resolved inline)

- **Spec coverage** (against decisions/auth-integration.md): API client → Task 2. state.session → Task 1. storage sync hooks (cache-through, fire-and-forget) → Task 3. password policy live checklist → Tasks 4/5/6. auth modal (login/register/verify-pending) → Tasks 5/6. topbar button → Task 5. 401 global handler + toast + reopen login → Tasks 2/8. anon→login migration → Task 7. logout B-lite flush → Task 6. boot GET /auth/me once → Task 8. Offline write-queue explicitly **out of scope** (v3, per the Offline note). Same-origin relative base **out of scope** (no domain yet).
- **Duplicate id fix:** verify-panel "back to login" id renamed `auth-verify-to-login` (Task 5 step 2 note + Task 6 wiring).
- **Double-fire guard:** clears write localStorage directly to skip `saveBookmarks` diff (Task 3 step 3).
- **Toast action-label limitation:** migration "Keep/Discard" currently rides the single-action toast (`onUndo`); flagged in Task 7 for optional upgrade. Acceptable for v0.
- **No SW change** → no cache bump needed.
- **Known assumption:** reads use `state.currentWikiId` for `wiki_id` (reads always toggled on current wiki). Commented in code.
