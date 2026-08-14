# Authentication

> **Hub article.** This page is the survey + decision layer for authentication mechanisms - it does not trace any single mechanism's full mechanics, gotchas, and interview scenarios in depth. Each mechanism has its own page: [Session-Based Authentication](./session-auth.md), [JWT](./jwt.md), [OAuth 2.0 & OIDC](./oauth-oidc.md), [Multi-Factor Authentication](./mfa.md), [Service-to-Service Authentication](./service-to-service-auth.md).

## Prerequisites

- **HTTPS & TLS** [Must read] <!-- link: ../components/tls.md -->
- **HTTP Cookies & Headers** [Must read] <!-- link: ../components/http.md -->
- **Asymmetric Cryptography** [Should read] <!-- link: ../algorithms/cryptography.md -->

---

## Table of Contents

- [TLDR](#tldr)
- [What It Is](#what-it-is)
- [AuthN vs AuthZ](#authn-vs-authz)
- [Identity, Principals, Claims](#identity-principals-claims)
- [Stateful vs Stateless - The Central Decision](#stateful-vs-stateless--the-central-decision)
- [Which Mechanism? - Decision Guide](#which-mechanism--decision-guide)
- [Members](#members)
- [Credential Storage & Transmission](#credential-storage--transmission)
- [Production Failure Modes](#production-failure-modes)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

Authentication is the process of verifying who a principal is. The core architectural decision is stateful vs stateless: sessions are server-side state with instant revocability; JWTs are self-contained tokens that verify without a database lookup but cannot be revoked before expiry. OAuth 2.0 + OIDC is the delegation and federated-identity layer built on top of either. In production, the hard problems are not choosing a pattern but the failure modes that emerge from it - session fixation, JWT revocation gaps, and refresh-token theft are the three that recur most.

---

## What It Is

**Mental model:** every secured request has three steps in sequence - establish identity (authentication), determine permissions (authorization), enforce access (policy). Each builds on the previous one; none substitutes for another.

Authentication answers "who are you?" It says nothing about what that identity is allowed to do - that's authorization. <!-- link: ./authorization.md -->

### AuthN vs AuthZ

|              | AuthN                              | AuthZ                                 |
| ------------ | ----------------------------------- | ---------------------------------------- |
| Question     | Who are you?                        | What can you do?                          |
| Input        | Credential (password, token, cert)  | Verified identity + resource + action     |
| Output       | Principal identity                  | Allow / Deny decision                     |
| Failure mode | Impersonation                       | Privilege escalation                      |

> ⚠️ **Warning / Gotcha**
> OAuth 2.0 is a delegated authorization framework, not an authentication protocol. Using an OAuth access token to answer "who is this user?" without OIDC is a common and exploitable mistake - see [OAuth 2.0 & OIDC](./oauth-oidc.md).

### Identity, Principals, Claims

**Principal:** any entity that can be authenticated - a human user, a service, a device, or a background job.

**Identity:** the set of verified attributes that uniquely identify a principal - a stable, unique identifier (typically a UUID) plus associated attributes, not a username.

**Credential:** the proof a principal presents to assert its identity - passwords, tokens, certificates. Ephemeral; compromising one compromises the identity until rotated or revoked.

**Claims:** key-value assertions about a principal, embedded in a token or session - identity claims (`sub`, `email`, `name`), authorization claims (`roles`, `scopes`), token metadata claims (`iss`, `aud`, `exp`, `iat`). Claims are _assertions_, not verified facts - the consumer must trust the issuer.

> 🧠 **Thought Process**
> Separate identity claims from authorization claims. Identity claims (who) are stable. Authorization claims (what they can do) change as roles evolve. A long-lived token with embedded role claims goes stale the moment permissions change - short expiry or permission-free tokens with server-side lookups are often the right call for permission-sensitive systems.

---

## Stateful vs Stateless - The Central Decision

This is the one architectural tension that determines which mechanism family you reach for. It's stated in full **here, once** - every other section and member page links back to this rather than restating it.

**Stateful (server-side sessions):** the server maintains a session store. The client sends an opaque session ID (typically a cookie); the server looks it up to retrieve the full session context.

**Stateless (token-based, e.g. JWT):** all auth information is encoded in the token itself. The server verifies cryptographically - no external lookup.

| Dimension          | Stateful (Sessions)                    | Stateless (JWT)           |
| -------------------- | ----------------------------------------- | ----------------------------- |
| Revocation          | Instant - delete the session record       | Delayed (TTL-bound) unless a blocklist reintroduces state |
| Server state        | Required (session store)                  | None                           |
| Verification cost   | DB/cache lookup (~0.3ms Redis, ~5-15ms DB)| CPU-only signature check (<1ms)|
| Token size          | ~32 bytes (opaque ID)                     | ~300-500 bytes                 |
| Cross-service use   | Requires shared store                     | Native (verify locally)        |
| Horizontal scale    | Needs shared store (not sticky sessions)  | Trivial                        |

Neither is universally superior - the decision follows from revocability requirements and service topology. Sessions scale fine horizontally; the requirement is a shared store, not that they "don't scale."

> ⚖️ **Decision Framework**
> Is instant revocation a hard requirement (financial, medical, high-security)? → Sessions. Not a hard requirement, and requests spread across independent services? → JWT, each service verifies locally with no shared session store. Full mechanics of each: [Session-Based Authentication](./session-auth.md), [JWT](./jwt.md).

---

## Which Mechanism? - Decision Guide

```text
Who is the client?
  ├─ Browser-based web app
  │    └──▶ Identity managed by a third party (Google, GitHub, Okta)?
  │              ├─ YES ──▶ OAuth 2.0 + OIDC (Authorization Code Flow + PKCE)
  │              └─ NO (you own the identity store)
  │                   └──▶ Multiple services need to verify the same identity?
  │                             ├─ YES ──▶ JWT (stateless, cross-service verification)
  │                             └─ NO  ──▶ Session-based (simpler, instant revocation, fits monoliths)
  │
  ├─ Mobile / native app (no server-side backend)
  │    └──▶ OAuth 2.0 + OIDC - Authorization Code Flow + PKCE
  │
  └─ Machine-to-machine (no human user)
       └──▶ Services in the same cluster / mesh?
                 ├─ YES ──▶ mTLS or JWT with service accounts (see Service-to-Service)
                 └─ NO  ──▶ OAuth 2.0 Client Credentials Flow
```

> ⚖️ **Decision Framework**
> The two questions that eliminate the most wrong answers in an interview: (1) "Does a human log in, or is this service-to-service?" and (2) "Can you tolerate a window where a revoked credential still has a valid token?" See the [Stateful vs Stateless](#stateful-vs-stateless--the-central-decision) table above for the full reasoning.

**Key Takeaway:** Client type and revocation tolerance are the two load-bearing decisions. Everything downstream - signing algorithms, storage location, grant type - follows from these two answers.

---

## Members

| Page | Covers |
| ---- | ------ |
| [Session-Based Authentication](./session-auth.md) | Server-side session mechanics, storage (Redis/DB), cookie attributes, <abbr>horizontal scaling</abbr>, fixation/hijacking |
| [JWT](./jwt.md) | Token structure, claims, HS256 vs RS256 vs ES256, JWKS key distribution, `alg:none` and algorithm-confusion attacks |
| [OAuth 2.0 & OIDC](./oauth-oidc.md) | Core roles, all 4 grant types (Authorization Code+PKCE, Client Credentials, Device, deprecated Implicit), ID token vs access token, the OAuth-is-not-authentication trap |
| [Multi-Factor Authentication](./mfa.md) | TOTP mechanics, WebAuthn/Passkeys, why SMS OTP is weak, step-up authentication |
| [Service-to-Service Authentication](./service-to-service-auth.md) | API keys, mTLS, JWT with service accounts, SPIFFE/SPIRE for workload identity |

Token lifecycle concerns that span multiple mechanisms (refresh token rotation, revocation strategies, logout layers) are covered once, below, rather than duplicated per member.

### Token Lifecycle - Expiry, Rotation, Revocation, Logout

**Access token expiry** is a security/operational trade-off: very short (1-5 min) minimizes the stolen-token window but increases AS load; 15 minutes is standard practice with refresh tokens; long-lived (hours+) creates a large revocation gap and should be avoided as a shortcut around implementing refresh handling.

**Refresh tokens** obtain new access tokens without re-authenticating. **Rotation** invalidates each refresh token on use and issues a new one - this enables **reuse detection**: if an already-rotated token is presented again, the AS cannot tell which holder is legitimate, so it revokes the entire token family and forces re-authentication for both. This is the correct response, not a bug.

**Revocation strategies**, in order of operational cost: (1) accept the TTL-bound delay and keep access tokens short - the default for most systems; (2) a revocation endpoint (RFC 7009) that tells the AS a token is invalid, with the resource server learning via introspection; (3) token introspection (RFC 7662) - the resource server checks validity on every request, real-time but one AS call per request, mitigated with 30-60s caching; (4) a `jti` blocklist in Redis with TTL equal to remaining token lifetime; (5) a per-user `token_version` counter, incremented to force logout across all of a user's devices at once with one DB/cache read per request.

**Logout has three layers, and most bugs come from implementing only one:** local (clear the client's copy - for JWTs the token remains valid until `exp`), federated/RP-initiated (redirect to the AS's end-session endpoint, ending the IdP session), and back-channel (the AS proactively notifies all registered apps server-to-server - the only layer that works even if the browser is already closed, necessary for complete SSO logout).

> 🎯 **Interview Lens**
> **Q:** How would you revoke a JWT before it expires?
> **Ideal answer:** Three options with different trade-offs - (1) short-lived tokens, accept the gap; (2) `jti` blocklist, instant but adds I/O; (3) token version counter, coarser (all-or-nothing per user) but one field to check. Choose based on security requirements.
> **Common trap:** "Just set a very short expiry." Follow-up: "What's the minimum expiry where the system still works?" - without refresh tokens, short expiry is unusable.
> **Next question:** "How do you rotate the signing key without logging everyone out?" → See [JWT § Zero-Downtime Key Rotation](./jwt.md#zero-downtime-key-rotation).

---

## Credential Storage & Transmission

**Mental model:** storage decisions are about which attacker you're defending against. The XSS attacker runs JavaScript in your page's context; the CSRF attacker tricks the user's browser into making requests. No single storage location defeats both - design explicitly for the threat model.

### Password Hashing

Fast hashes (MD5, SHA-1, SHA-256) are wrong for passwords - modern GPUs compute billions of hashes/second, making a leaked database crackable in hours. The correct countermeasures: **salting** (unique random value per user, defeats rainbow tables) and **slow, memory-hard <abbr>hashing</abbr>**.

**Argon2id** is the current recommendation (OWASP, NIST SP 800-63B) - memory-hard (defeats GPU/ASIC parallelization), side-channel resistant. OWASP minimums: `time_cost=2, memory_cost=19456` (19MB), `parallelism=1`.

```python
from argon2 import PasswordHasher
ph = PasswordHasher(time_cost=2, memory_cost=65536, parallelism=2, hash_len=32, salt_len=16)
hashed = ph.hash("user_password")
ph.verify(hashed, "user_password")   # raises if invalid
```

**bcrypt** remains acceptable for legacy systems but has two known issues: silent truncation at 72 bytes (two passwords sharing the first 72 bytes collide), and it is not memory-hard. **scrypt** is memory-hard but Argon2id is preferred for new systems.

| Algorithm    | Memory-Hard | Side-Channel Resistant | Recommended                         |
| ------------ | ----------- | ------------------------ | -------------------------------------- |
| bcrypt       | No          | Yes                       | Legacy systems, still acceptable       |
| scrypt       | Yes         | Partial                   | Acceptable; prefer Argon2id for new    |
| Argon2id     | Yes         | Yes                       | Current recommendation                 |
| MD5 / SHA-\* | No          | -                         | Never for passwords                    |

**Pepper:** a server-side secret (env var / secrets manager, never the DB) added before hashing. If the database leaks without the app server being compromised, offline cracking is blocked entirely, not just slowed. Use a distinct pepper per environment - a leaked dev pepper must not compromise production.

**Algorithm upgrades:** on each successful login, verify with the old algorithm, then re-hash with the new one and update the stored hash. Optionally force a reset after a deadline for users who never log back in.

### Token Storage - Cookies vs localStorage vs Memory

| Storage             | XSS Readable         | Sent Automatically       | Persists                    | CSRF Risk                  |
| --------------------- | ---------------------- | --------------------------- | ------------------------------ | ------------------------------ |
| HttpOnly cookie      | No                    | Yes (same + cross-site)   | Yes                            | Yes - requires mitigation     |
| localStorage         | Yes                   | No                          | Yes (across tabs/restart)      | No                              |
| In-memory (JS var)   | Yes (if XSS active)   | No                          | No (lost on refresh)           | No                              |

**CSRF** (attacker tricks the browser into sending a forged request; cookies attach automatically): mitigated by `SameSite=Lax` (modern default - blocks cross-site sub-resource requests, allows top-level navigation) or a CSRF synchronizer token. `SameSite=Strict` is tempting but breaks OAuth/SAML redirect flows - the return from the IdP is a cross-site navigation, so the cookie isn't sent and the user appears logged out immediately after logging in.

**XSS** (attacker's injected script runs in the page's origin, can read localStorage/sessionStorage/in-memory vars, cannot read HttpOnly cookies): mitigated by a strict CSP, output encoding, and putting the highest-value credential in an HttpOnly cookie so it survives an XSS event.

**Recommended SPA pattern:** refresh token in an HttpOnly Secure SameSite=Strict cookie (never JS-accessible, survives refresh); access token in-memory (lost on refresh, silently renewed via the refresh cookie on page load). XSS can steal at most a 15-minute access token; the refresh token stays out of reach.

> 🎯 **Interview Lens**
> **Q:** Where should a SPA store its auth tokens?
> **Ideal answer:** Split by lifetime and value - refresh token in an HttpOnly cookie, access token in memory. Maximizes protection on the high-value credential while keeping the short-lived one out of persistent storage.
> **Common trap:** "Store both in localStorage for simplicity." XSS anywhere on the domain then steals both permanently, including the long-lived refresh token.
> **Next question:** "What happens on page refresh if the access token is in memory?" → A silent call to the refresh endpoint (HttpOnly cookie sent automatically) returns a new access token into memory - seamless to the user.

**Key Takeaway:** Argon2id for new systems. For tokens: HttpOnly protects against XSS, non-cookie storage protects against CSRF - the split pattern (refresh in cookie, access in memory) gets both for SPAs.

---

## Production Failure Modes

Failure modes specific to one mechanism (e.g. TOTP phishing, mTLS PKI rotation) live on that mechanism's page. These are the hub-level failures that cut across mechanisms:

**Session store unavailability** - Redis down means every session lookup fails; users are effectively logged out en masse with no distinct error code, just elevated 401s. Mitigate with Redis HA and a <abbr>circuit breaker</abbr> that degrades gracefully rather than hard-failing.

**JWKS endpoint unavailable** - services can't verify signatures once the cached key set expires. Correct behavior is to **fail closed** (reject, serve 503 not 401) rather than fail open and accept unverified tokens. Cache TTL should survive short AS outages (5-60 min); retry once on an unknown `kid`, not aggressively.

**IdP downtime** - blocks all new logins if authentication is federated; existing tokens remain valid until expiry. Maintain a break-glass local admin path for critical internal tooling, and track IdP SLA (99.9% ≈ 8.7h/year) as a real dependency in your own SLO.

**Token leakage via logs** - tokens in URL query params are logged by every proxy/CDN by default; error trackers (Sentry) can capture full request headers. Always use the `Authorization` header or an HttpOnly cookie, never a query param; configure error trackers to scrub auth headers.

**`redirect_uri` manipulation** - if the AS allows prefix/wildcard matching instead of exact match, an attacker can register a lookalike domain and steal the authorization code on redirect. Fix at the AS: exact byte-for-byte match only.

**Open redirect via `?next=`** - an unvalidated post-login redirect parameter lets an attacker send a user to a phishing page right after a real, successful login. Validate `next` is a relative in-app path, reject anything starting with `//` or containing a hostname.

**Account enumeration** - distinct "user not found" vs "wrong password" error messages let an attacker map which emails have accounts. Return one identical message and one constant response time for all failed logins.

**Non-constant-time comparison** - naive string comparison short-circuits on the first mismatched byte, letting a timing attack recover a secret byte-by-byte. Always use `hmac.compare_digest` (Python), `crypto.timingSafeEqual` (Node), or the runtime equivalent for CSRF tokens, HMAC signatures, and API keys.

**Stale JWKS cache after rotation** - removing an old signing key from the JWKS endpoint before all tokens signed with it have expired causes valid, recently-issued tokens to be rejected as "unknown kid." Keep the old key published for at least one full access-token TTL after rotating.

**JWT `exp` clock skew cascade** - if NTP sync fails on a subset of instances, that subset starts rejecting valid tokens with intermittent, hard-to-diagnose 401s. Monitor clock drift as infrastructure health; set `leeway` to 30-60s in verification.

---

## Interview Scenario Bank

### Scenario 1 - Design Auth for a Multi-Tenant SaaS Application

**Setup:** B2B SaaS. Each customer (tenant) has its own users. Enterprise customers require SSO through their corporate IdP; self-serve customers use username/password. All tenants share the same API but must be strictly isolated.

**Ideal approach:** Identify tenant first (subdomain, email domain, or explicit selection) before any auth decision. Enterprise tenants federate via their IdP (your platform is the Relying Party). Self-serve tenants use local auth (Argon2id + TOTP/WebAuthn). Regardless of method, issue a JWT with `sub`, `tid` (tenant ID), `roles`, `exp` - every API request enforces tenant isolation at the query layer using the validated `tid`, never a client-supplied tenant ID.

**Follow-up:** "A tenant's IdP goes down?" → existing JWTs stay valid, new logins for that tenant fail; mitigate with a per-tenant break-glass local admin.
**Follow-up:** "A user belongs to multiple tenants?" → separate token per tenant context; switching requires a new token exchange, not re-authentication.

### Scenario 2 - Debugging: Users Randomly Logged Out

**Setup:** JWTs with 1-hour expiry, refresh tokens in HttpOnly cookies, automatic client-side refresh. Users report random logouts, worse at peak hours.

**Debugging order:** (1) Logouts at exactly the 1-hour mark → refresh is failing outright, check the refresh endpoint and cookie scope. (2) Logouts right after a successful refresh → a multi-tab race: two tabs both refresh near-simultaneously, the second presents an already-rotated token, reuse detection revokes the whole family. Fix with single-tab refresh coordination (`BroadcastChannel` or a mutex). (3) Intermittent, varies by instance → clock skew, check `exp` against the rejecting instance's clock. (4) Elevated 401s correlated with Redis metrics → session-store <abbr>latency</abbr>/pool exhaustion timing out lookups.

### Scenario 3 - Suspended Account Still Has API Access

**Setup:** Suspended users retain API access for up to 15 minutes (the access token TTL) because JWT verification is stateless and never checks the DB.

**Solutions, by trade-off:** accept the window (revoke the refresh token immediately, wait out the access-token TTL); a `token_version` counter checked against a short-TTL cache read; a `jti` blocklist; or full token introspection for instant revocation at the cost of an AS call per request. For a payments API, the 15-minute window is not acceptable - use introspection or the blocklist.

### Scenario 4 - Design Auth for a Mobile Banking App

**Setup:** MFA required for all users, step-up for high-value transactions, 30-day remember-device, full audit trail.

**Ideal design:** Password + platform biometric (primary) with TOTP fallback. 5-minute access token, 30-day refresh token in hardware-backed keychain (iOS Keychain / Android Keystore), access token in-memory only. Step-up via `acr`/`auth_time` claims for transfers. Device-bound refresh tokens (fingerprint check on refresh) with notification + step-up on an unrecognized device. Append-only audit log of every auth event, replicated off the primary system.

### Scenario 5 - Migrate from Sessions to JWTs Without Logging Everyone Out

**Setup:** Monolith on shared Redis sessions, splitting into microservices that won't share that Redis instance. 2M active users, cannot force re-login.

**Three-phase migration:** (1) new logins get a JWT issued alongside the existing session cookie, verification checks JWT first then falls back to session; (2) opportunistically issue a JWT on every authenticated session request until, after one session TTL, all recently-active users are migrated; (3) after `max_session_TTL` has elapsed since phase 2 began, remove the session fallback and decommission the shared store. The JWKS endpoint must be live and every service verifying against it before phase 1 begins.

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form                              | One-line meaning                                                          |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| AuthN   | Authentication                             | Verifying the identity of a principal                                      |
| AuthZ   | Authorization                              | Determining what an authenticated principal can do                         |
| JWT     | JSON Web Token                             | Self-contained signed token carrying claims - see [JWT](./jwt.md)          |
| OIDC    | OpenID Connect                             | Identity layer on top of OAuth 2.0 - see [OAuth 2.0 & OIDC](./oauth-oidc.md) |
| AS      | Authorization Server                       | Issues tokens; the trust anchor in OAuth/OIDC flows                        |
| RS      | Resource Server                            | Hosts protected resources; validates access tokens on each request         |
| IdP     | Identity Provider                          | System that stores identities and issues assertions or tokens              |
| MFA     | Multi-Factor Authentication                | Authentication using 2+ factors from distinct categories - see [MFA](./mfa.md) |
| SSO     | Single Sign-On                             | One authentication event grants access to multiple services                |
| mTLS    | Mutual TLS                                 | Both sides prove identity via certificates - see [Service-to-Service](./service-to-service-auth.md) |
| CSRF    | Cross-Site Request Forgery                 | Attack that tricks a browser into making authenticated requests to another site |
| XSS     | Cross-Site Scripting                       | Attack that injects executable scripts into a page's origin context        |

### Anti-patterns

- **Long-lived access tokens without a revocation strategy** - the stolen-token window equals the token lifetime. Use short TTL + refresh tokens, and add a revocation mechanism for high-security actions.
- **Storing the refresh token in localStorage** - one line of injected JS reads it via `localStorage.getItem`; the theft grants indefinite access. Use an HttpOnly Secure cookie.
- **Using an OAuth access token to identify the user** - answers "what can this client do?", not "who is this user?" A token issued to service A can be replayed to service B. Use the OIDC ID token with `aud` validation.
- **Not regenerating the session ID on login** - session fixation: an attacker-planted pre-login session ID becomes a valid authenticated session after the victim logs in. Always call `session.regenerate_id()` on successful auth.
- **Not implementing back-channel logout in SSO** - logging out of one app leaves the user silently authenticated everywhere else sharing the IdP session.
- **Embedding role/permission claims in long-lived JWTs** - permissions changing mid-token-lifetime don't take effect until expiry. Use short TTL or a version check for permission-sensitive tokens.
- **Sharing a pepper across environments** - a leaked dev/staging pepper compromises production if they share the same value. Use a distinct pepper per environment.

### Selection Matrix

| Dimension                     | Session-Based                                              | JWT                                                 | OAuth + OIDC                                             |
| -------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| Revocation speed               | Instant                                                          | Delayed (TTL-bound unless blocklist)                    | Depends on token type used                                       |
| Server state required          | Yes (session store)                                              | No (local verification)                                 | Depends on token type                                             |
| Cross-service verification     | Requires shared store                                            | Native (verify locally with public key)                 | Native with JWKS                                                  |
| Third-party / federated identity | No                                                              | No (internal only)                                       | Yes - designed for it                                              |
| SPA / mobile client fit        | Poor (cookie complexity)                                         | Good                                                     | Best (designed for public clients)                                 |
| Best for                       | Monoliths, internal tools, high-revocability requirements        | Distributed systems, stateless APIs, microservices        | Third-party auth, SSO, mobile/SPA with federated identity          |
