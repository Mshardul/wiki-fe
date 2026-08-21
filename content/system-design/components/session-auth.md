# Session-Based Authentication

## Prerequisites

- **[Authentication](./authentication.md)** [Must read] - session-based auth is one of the two implementation families under the stateful-vs-stateless decision; the hub covers when to reach for it over JWTs.
- **HTTP Cookies & Headers** [Must read] <!-- link: ../components/http.md -->

---

## Table of Contents

- [TLDR](#tldr)
- [Mental Model](#mental-model)
- [How It Works](#how-it-works)
- [Session Storage](#session-storage)
- [Cookies - HttpOnly, Secure, SameSite](#cookies--httponly-secure-samesite)
- [Quick Decision Guide](#quick-decision-guide)
- [Horizontal Scaling - Sticky Sessions vs Shared Store](#horizontal-scaling--sticky-sessions-vs-shared-store)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

Session-based auth keeps an opaque session ID in a cookie while all identity and permission data lives server-side in a session store. The core trade-off against JWTs is instant revocability (delete the record, access is gone) versus a mandatory shared store for horizontal scale. Redis is the standard store; the two non-negotiables are regenerating the session ID on login and setting `HttpOnly`/`Secure` on the cookie. A session's real failure mode isn't the login flow - it's what happens to every logged-in user the instant the shared store goes down.

---

## Mental Model

A session is a coat-check ticket, not a passport: the ticket itself (`session_id`) carries no information - it's just a number the client presents back. All the "identity" lives on a shelf behind the counter (the session store), keyed by that number. Lose the ticket, lose nothing but access; the coat-check counter throwing out the ticket (server-side deletion) is what actually revokes it - not something the holder of the ticket can prevent or detect in advance.

---

## How It Works

```text
1. User submits credentials (POST /login)
         │
         ▼
2. Server verifies credentials against identity store
         │
         ▼
3. Server creates session record:
   { session_id: "abc123...", user_id: 42, roles: ["user"], expires_at: +24h }
   Stored in session store (Redis / DB)
         │
         ▼
4. Server sets cookie:
   Set-Cookie: session_id=abc123...; HttpOnly; Secure; SameSite=Lax; Path=/
         │
         ▼
5. Browser attaches cookie automatically on every subsequent request
         │
         ▼
6. Server receives session_id → looks up in store → retrieves context → processes request
         │
         ▼
7. Logout: server deletes session record → cookie becomes orphaned → access revoked immediately
```

One property worth emphasising: the session ID is opaque - it encodes nothing. An attacker who intercepts it can replay it, but cannot forge a different one or extract information from it. All sensitive data lives server-side.

---

## Session Storage

### In-Memory (Process Memory)

Session state lives inside the application process. Zero infrastructure overhead, zero latency.

**Why it fails in production:** State doesn't survive process restarts. With multiple instances, a request routed to a different process finds no session and forces re-login. Only valid for single-instance development environments.

### Redis

_The standard production choice for session storage._

Sub-millisecond reads, native TTL support (keys auto-expire without a cleanup job), pub/sub for cross-node invalidation, and replication for HA. A single Redis node comfortably handles millions of session keys.

```shell
SET session:abc123 '{"user_id":42,"roles":["user"]}' EX 86400
GET session:abc123
DEL session:abc123
```

Cluster Redis for HA. Use Redis Sentinel or Redis Cluster depending on write volume. The session store is a critical path dependency - its failure equals a site-wide logout (see [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)).

### Database (PostgreSQL / MySQL)

Persistent across restarts; queryable for audit and admin use. The cost is latency (~5-15ms per lookup vs ~0.3ms for Redis) and added load on the primary database, which is already under write pressure.

Acceptable for low-traffic admin systems or when session reads are infrequent. Not appropriate as a session store for high-traffic consumer applications.

| Storage   | Latency | Survives Restart       | Shared Across Instances | Best For                  |
| --------- | ------- | ----------------------- | ------------------------ | -------------------------- |
| In-memory | <0.1ms  | No                      | No                       | Dev only                   |
| Redis     | ~0.3ms  | Yes (with persistence)  | Yes                      | Production default         |
| DB        | ~5-15ms | Yes                     | Yes                      | Low-traffic / audit needs  |

A managed Redis (ElastiCache, Memorystore, Redis Cloud) removes cluster-ops overhead at a per-GB premium over self-hosting; for session data specifically - small keys, high read volume, no need for exotic data structures - the managed premium is usually worth it, since the operational cost of running HA Redis yourself (failover testing, patching, monitoring) rivals the price difference at most team sizes.

---

## Cookies - HttpOnly, Secure, SameSite

The session cookie is the attack surface. Each attribute closes a specific vector.

**`HttpOnly`:** Prevents JavaScript from reading the cookie via `document.cookie`. Eliminates session theft via XSS - a script injected by an attacker cannot extract the session ID.

**`Secure`:** Cookie is only transmitted over HTTPS. Prevents the session ID from being sent over plaintext HTTP, which would expose it to network-level interception.

**`SameSite`:** Controls whether the browser sends the cookie on cross-site requests.

| Value    | When Cookie Is Sent                             | CSRF Protection | Notes                                                                |
| -------- | ------------------------------------------------ | ---------------- | --------------------------------------------------------------------- |
| `Strict` | Same-origin requests only                        | Full              | Breaks OAuth redirect flows - user returning from IdP loses session   |
| `Lax`    | Same-origin + top-level navigations (GET links)  | Partial           | Modern browser default; protects against most CSRF                    |
| `None`   | All requests, including cross-origin             | None              | Requires `Secure`; needed for embedded iframes, third-party auth      |

**`Lax` is the right default** for most session cookies - `Strict` breaks common auth redirect patterns where the user returns from an IdP via a cross-site navigation and the cookie isn't sent, appearing as an immediate logout. `None` is required only for cross-origin embedded contexts.

**`Domain` and `Path`:** Scope the cookie to specific subdomains or URL paths. A session cookie scoped to `.example.com` is shared across `api.example.com` and `app.example.com` - useful for SSO across subdomains but widens the exposure surface.

---

## Quick Decision Guide

**Use session-based auth when:** the client is a traditional browser app or monolith you control end to end, instant revocation matters (admin panels, financial/medical actions, "log out everywhere" needs to actually mean now), and you're not fanning requests out across many independently-deployed services that would each need to hit the same store.

**Reach for JWT instead when:** multiple independently-deployed services need to verify the same identity without a shared network hop, or the client is fully decoupled (public mobile API) from a session-owning backend. See [Authentication § Stateful vs Stateless](./authentication.md#stateful-vs-stateless--the-central-decision) for the full trade-off table - it is not restated here.

**Cost angle:** the real cost driver isn't sessions vs JWT (both are cheap at rest) - it's the store. A single self-hosted Redis primary handles most session workloads for near-zero incremental cost; the spend shows up in HA (replica + Sentinel/Cluster nodes) and in choosing managed vs self-hosted, as above. Sticky sessions look "free" but the true cost is the operational fragility and the load-balancing you give up (see below).

> 🌍 **In Practice:** Rails, Django, and Express (via `express-session`) all default to server-side sessions backed by Redis in production - it remains the default choice for server-rendered and traditional web apps, not a legacy pattern. At scale, the failure that actually shows up is not session logic itself but the store: a single Redis primary becomes a shared bottleneck once session reads cross tens of thousands of QPS, and a failover event that isn't handled by the client (no retry/backoff) manifests as a synchronized mass-logout across every active user at once.

---

## Horizontal Scaling - Sticky Sessions vs Shared Store

With multiple server instances, session lookup fails if the request lands on an instance that doesn't have the session.

**Sticky sessions (session affinity):** The load balancer routes all requests from the same client to the same backend instance (by IP hash or cookie). Avoids the need for a shared store.

Problems: defeats load balancing (one overloaded instance, others idle), instance failure loses all sessions pinned to it, doesn't work with auto-scaling where instances appear and disappear.

**Shared session store (Redis):** All instances read from the same store. Stateless backends - any instance handles any request. This is the correct approach for horizontally scaled systems. The Redis read (~0.3ms) is the cost, not a scalability limit - sessions scale fine with a shared store; they just require one.

> ⚖️ **Decision Framework**
> Sticky sessions look like they avoid infrastructure, but they trade it for an availability and elasticity problem - never choose them for a system that autoscales or needs even load distribution. The only defensible case for sticky sessions is a fixed, small instance count where adding Redis genuinely isn't worth the operational overhead (e.g. a two-instance internal tool).

---

## Production Failure Modes & Gotchas

### Session ID Generation

The session ID's entire security rests on being unguessable, not on any secrecy of the mechanism generating it. It must come from a CSPRNG (`secrets.token_urlsafe()` in Python, `crypto.randomBytes()` in Node) - never `Math.random()`, a sequential counter, or anything derived from predictable state like timestamps or user IDs. **128 bits of entropy is the common baseline** (session-fixation/prediction guidance from OWASP), making brute-forcing or guessing a valid ID computationally infeasible even at high request volumes. A low-entropy or patterned ID space turns session hijacking from "steal a cookie" into "guess a cookie" - session prediction - which needs no interception at all.

### Session Fixation

An attacker sets a known session ID on the victim's browser before they log in (by injecting a `Set-Cookie` via a subdomain takeover or HTTP response). After the victim logs in, the server associates their identity with that attacker-known ID. The attacker now holds a valid, authenticated session.

**Fix:** Always regenerate the session ID upon successful authentication, unconditionally. The pre-login session ID is discarded; a new unpredictable one is issued post-login.

```python
def login(username, password):
    if verify_credentials(username, password):
        session.invalidate()
        session.regenerate_id()
        session['user_id'] = user.id
```

### Session Hijacking

Attacker steals a valid session cookie (via XSS, network interception, or log exposure) and replays it.

Mitigations in order of effectiveness:

1. `HttpOnly` + `Secure` flags - close the two primary theft vectors
2. Short session TTL - limits the window of a stolen session
3. Absolute expiry + idle timeout - cap the maximum session lifetime regardless of activity
4. Rotate session ID on privilege change (password update, role change) - reduces exposure window after partial compromise

### Session Store Outage

The store is a single critical-path dependency: if Redis is unreachable, every session lookup fails, and every logged-in user sees an elevated rate of 401s indistinguishable from a mass logout - there's no graceful partial degradation without extra design.

**Mitigation:** Redis HA (Sentinel or Cluster) to remove the single point of failure, a circuit breaker on the session-store client so the app fails fast with a clear error instead of hanging on a dead connection, and - for read-mostly endpoints - considering a short-lived local cache of session validity to survive a brief outage rather than logging everyone out for a 30-second blip.

### Cookie Scope Too Wide

Setting `Domain=.example.com` to share a session across subdomains for SSO also means every subdomain - including lower-trust ones like a marketing microsite or a third-party-hosted docs site - can read and send that cookie. A vulnerability on any one subdomain becomes a session-theft vector for the whole domain. Scope `Domain` to only the subdomains that genuinely need the shared session.

### Common Misconceptions

- **"Sessions don't scale horizontally."** They scale fine - the requirement is a shared store, not that the pattern is inherently unscalable. Sticky sessions are one (bad) workaround, not the only option.
- **"Deleting the cookie logs the user out."** Deleting the client-side cookie removes the client's copy, but if the server-side session record isn't also deleted, anyone who captured the session ID beforehand can still replay it. Revocation has to happen at the store, not the client.

---

## Interview Scenario Bank

> 🧭 **Opening framing:** "Before designing this, I'd confirm whether instant revocation is a hard requirement and whether we're serving this from one deployable unit or fanning out across services - that decides sessions vs JWT before anything else about storage or cookies matters."

> 🎯 **Interview Lens**
> **Q:** How do you handle session management in a horizontally-scaled system?
> **Ideal answer:** Move session state out of the application process into a shared external store - Redis is the standard. All instances read from the same Redis cluster; any instance can serve any request. Sticky sessions are an anti-pattern: they defeat load balancing and cause session loss on instance failure.
> **Common trap:** "Use sticky sessions." Interviewers follow up with "what happens when that instance goes down?" - the candidate then has no answer.
> **Next question:** The session store goes down entirely - what happens to logged-in users, and how would you reduce the blast radius?

> 🎯 **Interview Lens**
> **Q:** A user reports they were logged out of one browser tab but stayed logged in on another tab of the same browser, same account. Is that a bug?
> **Ideal answer:** Depends on the design - if each login issues a distinct session record (common for multi-device support), logging out one tab only deletes that one session; other active sessions for the same user are untouched by design. It's only a bug if the intent was "log out everywhere," which requires enumerating and deleting all of that user's session records, not just the current one.
> **Common trap:** Assuming one user maps to one session record - most real systems key sessions by session ID, not user ID, specifically to support multiple concurrent logins.
> **Next question:** How would you implement a "log out of all devices" feature without switching away from per-session records entirely?

> 🎯 **Interview Lens**
> **Q:** Right after a user logs in with correct credentials, they're told the session is invalid. What's the most likely class of bug, and how do you confirm it?
> **Ideal answer:** Almost always a mismatch between where the session was written and where it's being read - could be a session ID regenerated after the record was set (order-of-operations bug), a cookie `Domain`/`Path` scope that doesn't match the request's origin, or a session write landing on a different store shard/replica than the read. Confirm by logging the session ID at write time and at the failing read, and checking cookie attributes actually sent by the browser.
> **Common trap:** Jumping straight to "the session store is down" without checking whether the write ever reached the store the read is querying.
> **Next question:** How would this same symptom look different if it were caused by clock skew on session expiry instead?

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form              | One-line meaning                                            |
| ------- | ----------------------- | -------------------------------------------------------------- |
| TTL     | Time To Live            | Duration before a stored value (session, cache key) expires    |
| HA      | High Availability       | Architecture designed to survive individual component failure  |
| XSS     | Cross-Site Scripting    | Attack that injects executable scripts into a page's origin context |
| CSRF    | Cross-Site Request Forgery | Attack that tricks a browser into making authenticated requests to another site |

### Anti-patterns

- **Not regenerating the session ID on login** - session fixation lets an attacker pre-plant a session ID that becomes valid the moment the victim authenticates. Always call `session.regenerate_id()` on successful auth.
- **Sticky sessions on an autoscaling fleet** - new instances start cold, scale-in events silently drop pinned sessions. Use a shared store instead.
- **Storing the session cookie without `HttpOnly`** - trivially readable by any injected script; defeats the primary XSS mitigation for free.
- **Treating client-side cookie deletion as revocation** - the server-side record must be deleted too, or a captured session ID remains replayable.

**Key Takeaway:** Sessions are operationally simple but require a shared store to scale horizontally. Redis is the default. The two non-negotiable security rules: always regenerate session ID on login (fixation), always set `HttpOnly` + `Secure` on the cookie (hijacking). The failure mode that actually matters at scale isn't the login flow - it's that the store is a single critical-path dependency for every request from every logged-in user.
