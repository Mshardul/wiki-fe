# Session-Based Authentication

## Prerequisites

- **[Authentication](./authentication.md)** [Must read] - session-based auth is one of the two implementation families under the stateful-vs-stateless decision; the hub covers when to reach for it over JWTs.
- **HTTP Cookies & Headers** [Must read] - session IDs are transmitted via cookies; cookie attributes (HttpOnly, Secure, SameSite) are the primary defence layer covered throughout this page. <!-- link: ../components/http.md -->

---

## Table of Contents

<!-- Partial article - seeded from authentication.md. Sections to be completed. -->

- [How It Works](#how-it-works)
- [Session Storage](#session-storage)
- [Cookies - HttpOnly, Secure, SameSite](#cookies--httponly-secure-samesite)
- [Tradeoffs & Scaling Challenges](#tradeoffs--scaling-challenges)

---

## TLDR

<!-- To be written when this article is fully developed. -->

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

Cluster Redis for HA. Use Redis Sentinel or Redis Cluster depending on write volume. The session store is a critical path dependency - its failure equals a site-wide logout.

### Database (PostgreSQL / MySQL)

Persistent across restarts; queryable for audit and admin use. The cost is latency (~5–15ms per lookup vs ~0.3ms for Redis) and added load on the primary database, which is already under write pressure.

Acceptable for low-traffic admin systems or when session reads are infrequent. Not appropriate as a session store for high-traffic consumer applications.

| Storage   | Latency | Survives Restart       | Shared Across Instances | Best For                  |
| --------- | ------- | ----------------------- | ------------------------ | -------------------------- |
| In-memory | <0.1ms  | No                      | No                       | Dev only                   |
| Redis     | ~0.3ms  | Yes (with persistence)  | Yes                      | Production default         |
| DB        | ~5–15ms | Yes                     | Yes                      | Low-traffic / audit needs  |

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

## Tradeoffs & Scaling Challenges

### Horizontal Scaling - Sticky Sessions vs Shared Store

With multiple server instances, session lookup fails if the request lands on an instance that doesn't have the session.

**Sticky sessions (session affinity):** The load balancer routes all requests from the same client to the same backend instance (by IP hash or cookie). Avoids the need for a shared store.

Problems: defeats load balancing (one overloaded instance, others idle), instance failure loses all sessions pinned to it, doesn't work with auto-scaling where instances appear and disappear.

**Shared session store (Redis):** All instances read from the same store. Stateless backends - any instance handles any request. This is the correct approach for horizontally scaled systems. The Redis read (~0.3ms) is the cost, not a scalability limit - sessions scale fine with a shared store; they just require one.

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

> 🎯 **Interview Lens**
> **Q:** How do you handle session management in a horizontally-scaled system?
> **Ideal answer:** Move session state out of the application process into a shared external store - Redis is the standard. All instances read from the same Redis cluster; any instance can serve any request. Sticky sessions are an anti-pattern: they defeat load balancing and cause session loss on instance failure.
> **Common trap:** "Use sticky sessions." Interviewers follow up with "what happens when that instance goes down?" - the candidate then has no answer.
> **Next question:** "The Redis session store goes down. What happens?" → Every user is effectively logged out on their next request. Mitigation: Redis HA (Sentinel / Cluster), circuit breaker to degrade gracefully, or a fallback to allow read-only access for cached sessions.

**Key Takeaway:** Sessions are operationally simple but require a shared store to scale horizontally. Redis is the default. The two non-negotiable security rules: always regenerate session ID on login (fixation), always set `HttpOnly` + `Secure` on the cookie (hijacking).
