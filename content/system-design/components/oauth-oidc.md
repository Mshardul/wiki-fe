# OAuth 2.0 & OIDC

## Prerequisites

- **[Authentication](./authentication.md)** [Must read] - OAuth/OIDC is the delegation and federated-identity layer the hub routes to; the AuthN-vs-AuthZ distinction is assumed knowledge here.
- **[JWT](./jwt.md)** [Should read] - ID tokens and (commonly) access tokens are JWTs; token structure and signing are covered there, not repeated here.

---

## Table of Contents

- [Core Roles](#core-roles)
- [Authorization Code Flow + PKCE](#authorization-code-flow--pkce)
- [Client Credentials Flow](#client-credentials-flow)
- [Device Authorization Flow](#device-authorization-flow)
- [Implicit Flow - Why It's Deprecated](#implicit-flow--why-its-deprecated)
- [Which OAuth Grant Type?](#which-oauth-grant-type)
- [OpenID Connect - ID Token vs Access Token](#openid-connect--id-token-vs-access-token)
- [Token Revocation & Refresh Token Rotation](#token-revocation--refresh-token-rotation)
- [OAuth Is Not Authentication - The Common Confusion](#oauth-is-not-authentication--the-common-confusion)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

OAuth 2.0 delegates authorization - a client gets scoped access to a resource without ever seeing the user's credentials - while OIDC layers identity on top via a signed ID token. The core decision is which grant type fits the client's trust boundary: server-side, browser-based, or device-only, each with a different answer to "where can a secret live safely?" The load-bearing trade-off is between token lifetime and blast radius - short-lived access tokens plus rotating refresh tokens bound the damage of a leaked credential, at the cost of more moving parts to get right.

**Interview soundbite:** OAuth's real question isn't which grant type to use - it's where a secret can live safely, and every flow is just a different answer to that.

---

## Core Roles

| Role                          | What It Is                                              | Example                             |
| ------------------------------ | --------------------------------------------------------- | ------------------------------------- |
| **Resource Owner**            | The user who owns the data                                | The end user logging in               |
| **Client**                    | The application requesting access                         | Your web app, mobile app              |
| **Authorization Server (AS)** | Authenticates the user, issues tokens                      | Google, GitHub, Auth0, your own IdP   |
| **Resource Server (RS)**      | Hosts the protected resources, validates access tokens     | Your API, Google Drive API            |

The Client and Resource Server are often owned by the same org. The Authorization Server can be external (federated identity) or internal (your own auth service). What matters architecturally: the AS is the trust anchor - every other component trusts what the AS asserts.

---

## Authorization Code Flow + PKCE

_The correct flow for any client that handles a human user, whether or not it has a server-side backend._

### Step-by-Step Mechanics

```
1. Client redirects user to Authorization Server:
   GET /authorize
     ?client_id=abc
     &redirect_uri=https://app.example.com/callback
     &response_type=code
     &scope=openid profile email
     &state=xyz789                    ← random value, CSRF protection
     &code_challenge=E9Melhoa2...     ← PKCE: SHA256(code_verifier)
     &code_challenge_method=S256

2. AS authenticates user (login form, MFA, etc.)
   AS shows consent screen: "App wants access to: profile, email"
   User approves.

3. AS redirects back to client:
   GET https://app.example.com/callback
     ?code=SplxlOBeZQQYbYS6WxSbIA    ← short-lived, one-use authorization code
     &state=xyz789                    ← client validates this matches step 1

4. Client exchanges code via back-channel (server-to-server):
   POST /token
     client_id=abc
     client_secret=secret             ← OR code_verifier for public clients (PKCE)
     grant_type=authorization_code
     code=SplxlOBeZQQYbYS6WxSbIA
     redirect_uri=https://app.example.com/callback
     code_verifier=dBjftJeZ4CVP...   ← PKCE: AS verifies SHA256(verifier) == challenge

5. AS responds:
   {
     "access_token": "eyJ...",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "8xLOxBtZp8",
     "id_token": "eyJ..."             ← OIDC only
   }
```

The authorization code (step 3) travels through the browser URL - visible in history and server logs. It is intentionally short-lived (typically 60 seconds) and single-use. The access token never touches the browser URL.

### PKCE - Proof Key for Code Exchange

PKCE solves the **authorization code interception attack**: a malicious app on the same device intercepts the redirect URI and steals the authorization code.

```
Before the request:
  code_verifier  = random 43–128 char string (kept secret by client)
  code_challenge = Base64Url(SHA256(code_verifier))

Step 1: client sends code_challenge to AS
Step 4: client sends code_verifier to AS
AS verification: SHA256(received_verifier) == stored_challenge?
```

Even if an attacker intercepts the authorization code, they cannot exchange it without the `code_verifier` - which was never transmitted. The AS rejects the exchange.

PKCE was originally designed for public clients (mobile, SPA) where a client secret cannot be safely stored. It is now recommended for **all** clients, including confidential ones with server-side backends - the original motivation was public clients, but the check adds negligible overhead and eliminates an entire attack class. OAuth 2.1 (the successor draft) makes PKCE mandatory for all grant types involving the authorization code.

> 🧠 **Thought Process**
> The `state` parameter is not optional. It binds the callback to the specific request that initiated the flow - if a response arrives without a matching `state`, the client must reject it. This prevents CSRF on the callback endpoint: an attacker cannot trick the user's browser into completing a login with the attacker's authorization code, which would bind the victim's session to the attacker's identity (account linkage attack).

### Redirect URI Validation Gaps

Step 3 above only works if the AS sends the authorization code to a `redirect_uri` it can trust. If the AS accepts a partial match - a prefix match, or an unvalidated wildcard subdomain - instead of an exact string match against a pre-registered allowlist, an attacker can register a lookalike callback endpoint (`https://app.example.com.attacker.com/callback` passing a naive prefix check) and receive the authorization code meant for the real client. There is no PKCE mitigation for this: PKCE protects the code-for-token exchange, not where the code itself gets delivered. The fix is entirely on the AS side - exact string match, no wildcards, no partial matches - see [Production Failure Modes & Gotchas](#production-failure-modes--gotchas) for the consolidated failure-mode summary.

---

## Client Credentials Flow

_For machine-to-machine communication where no user is involved._

```
Client                         Authorization Server
  │                                    │
  │── POST /token ───────────────────▶ │
  │   client_id=abc                    │
  │   client_secret=secret             │
  │   grant_type=client_credentials    │
  │   scope=reports:read               │
  │                                    │
  │◀─ { access_token, expires_in } ──  │
```

No redirect, no consent screen, no user context. The token is scoped to what the client application is allowed to do - not tied to any user identity. This flow does not issue refresh tokens; the client simply re-authenticates when the access token expires.

Use for: background jobs, microservice-to-microservice calls when services live in different trust domains, scheduled data exports.

Do not use when a user action is involved - the token won't carry user identity, and access decisions will be made in the client's context, not the user's. (For internal service mesh traffic, see [Service-to-Service Authentication](./service-to-service-auth.md) for mTLS/SPIFFE alternatives.)

---

## Device Authorization Flow

_For input-constrained devices that cannot open a browser (smart TV, CLI, IoT)._

```
1. Device requests codes:
   POST /device/code
     client_id=abc
     scope=profile

   Response:
   {
     "device_code": "GmRh....",
     "user_code": "WDJB-MJHT",
     "verification_uri": "https://example.com/device",
     "expires_in": 1800,
     "interval": 5
   }

2. Device displays to user:
   "Go to example.com/device and enter: WDJB-MJHT"

3. Device polls (every 5 seconds):
   POST /token
     grant_type=urn:ietf:params:oauth:grant-type:device_code
     device_code=GmRh....
     client_id=abc

   Responses: { "error": "authorization_pending" }  ← keep polling
              { "error": "slow_down" }               ← increase interval
              { access_token, refresh_token, ... }   ← user approved

4. User goes to verification_uri on phone/laptop, enters user_code, authenticates, approves.
```

The `user_code` is intentionally short and human-typeable. The `device_code` is the machine-readable half - never displayed to the user.

---

## Implicit Flow - Why It's Deprecated

_The access token lands in the URL fragment - browser history, server logs, and every script on the page can read it._

The Implicit Flow was designed for SPAs before PKCE existed. Instead of a code that gets exchanged, the access token is returned directly in the URL fragment after the redirect.

```
GET https://app.example.com/callback
  #access_token=eyJ...              ← token in URL fragment
  &token_type=Bearer
  &expires_in=3600
```

**Why this is a problem:**

1. **Fragment in browser history** - the access token is stored in the browser's navigation history. Anyone with access to the browser (shared machine, browser sync) has the token.
2. **Logged by referrer headers** - if the page loaded after the redirect makes any external requests, the fragment can appear in server logs via the `Referer` header.
3. **Accessible to all scripts on the page** - `location.hash` is readable by any JavaScript running on the page, including third-party analytics or CDN-hosted libraries.
4. **No refresh tokens** - the flow was designed to be short-lived; refresh tokens were considered too risky for public clients.
5. **No back-channel exchange** - the token is issued without any proof that the right party received it (no code verifier, no client secret).

Authorization Code + PKCE solves all of these: the access token is exchanged via a POST request to the token endpoint (not the browser URL), and PKCE proves the right client is performing the exchange.

> ⚠️ **Warning / Gotcha**
> You will still encounter Implicit Flow in legacy systems and older documentation. RFC 9700 (OAuth 2.0 Security Best Current Practice) explicitly states it should not be used for new deployments. If a system you are reviewing uses `response_type=token`, flag it - Authorization Code + PKCE replaces it with no meaningful complexity cost.

---

## Which OAuth Grant Type?

_With the mechanics of all four flows now covered, the selection question is which trust boundary the client actually sits in._

```text
Does the flow involve a human user?
  ├─ NO ──▶ Client Credentials Flow
  │           (service-to-service; no user consent step, no browser redirect)
  │
  └─ YES
       └──▶ Does the client have a browser?
                 ├─ NO ──▶ Device Authorization Flow
                 │           (TV, CLI, IoT; user approves on a second device)
                 │
                 └─ YES
                       └──▶ Does the client have a secure server-side backend?
                                 ├─ YES ──▶ Authorization Code Flow
                                 │           (client secret stored server-side)
                                 └─ NO (SPA, mobile)
                                          └──▶ Authorization Code Flow + PKCE
                                                (no client secret; code verifier proves intent)

  ⚠  Implicit Flow - deprecated. Access token exposed in URL fragment.
                      Do not use in new systems.
```

| Flow | Human involved | Secret storage | Refresh tokens | Use case |
| --- | --- | --- | --- | --- |
| **Authorization Code** | Yes | Client secret, server-side | Yes | Traditional server-rendered web app with a confidential backend (e.g. a server-side app federating login through Google or Okta) |
| **Authorization Code + PKCE** | Yes | None - code verifier replaces it | Yes | SPA or mobile app - any public client with no safe place to persist a secret |
| **Client Credentials** | No | Client secret, server-side | No - re-authenticates on expiry | Service-to-service calls, background jobs, scheduled exports |
| **Device Authorization** | Yes (on a second device) | None on the constrained device | Yes | Smart TV, CLI, IoT - no browser on the primary device |

**Pick it when:** a human logs in through a browser-capable client with a secure backend → Authorization Code; the same but no safe secret storage → add PKCE; no human at all → Client Credentials; a human but no browser on the device itself → Device Authorization. Implicit Flow never wins this decision - it is listed above only as the flow it replaces. In practice, providers like Auth0 and Okta enforce this same decision tree at the application-registration step - registering an app as a "Single Page App" client type disables the client-secret field entirely and forces PKCE, rather than leaving the choice to the developer.

> ⚖️ **Decision Framework**
> The two questions that eliminate the most wrong answers in an interview: (1) "Does a human log in, or is this service-to-service?" and (2) "Does the client have a secure place to store a secret?" No secure secret storage (SPA, mobile, CLI) → PKCE is mandatory, not optional.

At production scale, the pressure point isn't picking the right flow, it's the Authorization Server's token endpoint - high refresh-rotation volume (every rotating refresh token exchange is a token-endpoint call) turns what looks like a login feature into a sustained-throughput and database-write problem for the AS.

---

## OpenID Connect - ID Token vs Access Token

_OIDC adds authentication on top of OAuth's authorization: the ID token tells the client who the user is; the access token tells the resource server what the client can do._

OIDC is a thin layer on top of OAuth 2.0. It adds:

1. **ID Token** - a JWT containing identity claims about the authenticated user
2. **UserInfo Endpoint** - returns additional user claims given an access token
3. **Discovery Document** - `/.well-known/openid-configuration` - machine-readable metadata (endpoints, supported algorithms, supported scopes)

The critical distinction between the two tokens:

|                          | ID Token                                    | Access Token                                    |
| ------------------------- | --------------------------------------------- | -------------------------------------------------- |
| **Audience (`aud`)**     | The client application (client_id)            | The resource server (API)                           |
| **Purpose**              | Tells the client who the user is               | Lets the client call the resource server            |
| **Consumer**             | The client application                         | The resource server                                 |
| **Format**               | Always a JWT                                   | Opaque or JWT (AS decides)                           |
| **Contains**             | Identity claims: sub, email, name, picture     | Authorization scopes                                 |
| **Must be validated by** | Client (check aud = client_id, nonce, exp)     | Resource server (check aud = API, exp, scope)        |

The ID token is for the client. The access token is for the resource server. They should never be used interchangeably.

**Nonce:** A random value included in the authorization request and embedded in the ID token. The client verifies the nonce in the received ID token matches what it sent. This binds the ID token to a specific authentication request - preventing replay attacks where an old ID token is reused.

Both tokens are read by different parties for different purposes - see [Interview Scenario Bank](#interview-scenario-bank) for how this distinction gets probed.

---

## Token Revocation & Refresh Token Rotation

_Access-token TTL, refresh token rotation mechanics, and revocation strategies are hub-level concerns spanning every auth mechanism - see [Authentication § Token Lifecycle - Expiry, Rotation, Revocation, Logout](./authentication.md#token-lifecycle---expiry-rotation-revocation-logout) for the full treatment (short-TTL rationale, rotation + reuse-detection mechanics, and the revocation-strategy cost ladder). What follows is the OAuth-specific piece: the refresh grant's actual HTTP call, and a re-consent gotcha unique to the refresh flow._

A refresh token exchanges itself at the token endpoint for a new access token without forcing re-authentication:

```
POST /token
  grant_type=refresh_token
  refresh_token=8xLOxBtZp8
  client_id=abc

Response:
  { "access_token": "eyJ...", "refresh_token": "9yMPyCuAq9", "expires_in": 3600 }
```

### Scope Creep Through Silent Re-Consent

A refresh call is also where scope quietly grows if the AS lets it: a client that requests broader scopes on a later authorization, or on a refresh exchange, without the user explicitly re-approving - a pre-checked consent screen, or a refresh flow that silently merges in new scopes - accumulates access beyond what the user actually agreed to. The refresh token's job is to renew an existing grant, not to expand it; scope should be re-confirmed with explicit consent any time it grows, never merged silently into an existing family. See [Production Failure Modes & Gotchas](#production-failure-modes--gotchas) for the consolidated failure-mode summary.

---

## OAuth Is Not Authentication - The Common Confusion

_OAuth tokens prove authorization scope, not user identity - a valid access token cannot safely answer "who is this user?" without OIDC._

OAuth 2.0 answers: "Can this client access this resource on behalf of the user?" It does not answer: "Who is this user?"

An OAuth access token tells the resource server that the bearer has been granted certain scopes. It does not reliably identify the user to your application. The attack vector:

```
Attacker has a valid access token for Service A.
Attacker sends that token to Service B, which uses it as authentication proof.
Service B wrongly concludes: "this token was issued by Google, so the user is authenticated."
But Service B never verified the token was issued FOR IT.
```

The fix is `aud` validation on the ID token: it must equal the client's `client_id`; if `aud` is a different client's ID, reject the token. An ID token issued to Service A cannot be replayed to Service B.

### Confused Deputy via Missing `aud`/`azp` Checks

The attack vector above is a textbook confused deputy: Service B has more privilege than the attacker (it can act on tokens issued by a trusted AS), and the attacker tricks it into misusing that privilege by handing it a token that is genuinely valid - just not valid *for* Service B. Skipping `aud` (and, where multiple authorized parties share a token, `azp`) validation is what turns "this token is real" into "this token was meant for me," which are not the same claim. This is the most common production incident class in OAuth/OIDC systems precisely because the token passes every other check - signature, expiry, issuer - right up until audience. See [Production Failure Modes & Gotchas](#production-failure-modes--gotchas) for the consolidated failure-mode summary.

> 🧠 **Thought Process**
> When you see "login with Google" in a system design, ask: what exactly is Google returning, and what are we doing with it? If the system calls `/userinfo` with the access token and trusts the response to establish identity - that's correct OIDC usage. If it's using the access token itself as proof of identity (passing it between internal services, storing it as a session credential) - that's the OAuth-as-auth mistake. The interview signal: a strong candidate knows why `aud` exists and can explain what attack it prevents.

**Key Takeaway:** OAuth is authorization, not authentication. OIDC is the identity layer on top. The `aud` claim is the load-bearing security check that separates correct OIDC from exploitable OAuth-as-auth. In all multi-party flows, validate `aud`, `iss`, `nonce`, and `exp` on every ID token.

---

## Production Failure Modes & Gotchas

_Each mode below is traced in depth where it originates; this is the consolidated summary for fast recall._

### Redirect URI Validation Gaps

A `redirect_uri` accepted on anything less than an exact match (prefix match, unvalidated wildcard subdomain) lets an attacker register a lookalike callback and receive the authorization code meant for the real client. No wildcards, no partial matches - pre-registered allowlist, exact string match only. Full mechanics: [Redirect URI Validation Gaps](#redirect-uri-validation-gaps) under Authorization Code Flow + PKCE.

### Scope Creep Through Silent Re-Consent

A client that expands its granted scopes on a later authorization or refresh call without the user explicitly re-approving - pre-checked consent screen, or a refresh flow that silently merges in new scopes - ends up with access beyond what was actually agreed to. Full mechanics: [Scope Creep Through Silent Re-Consent](#scope-creep-through-silent-re-consent) under Token Revocation & Refresh Token Rotation.

### Confused Deputy via Missing `aud`/`azp` Checks

The single most common production incident class in OAuth/OIDC systems: a resource server or client that skips audience validation can be tricked into accepting a token that is genuinely valid, just not valid for it. Full mechanics: [Confused Deputy via Missing `aud`/`azp` Checks](#confused-deputy-via-missing-audazp-checks) under OAuth Is Not Authentication.

### Common Misconceptions

- **"OAuth logs the user in"** - OAuth alone only grants delegated access; without OIDC's ID token, there is no standardized way to establish who the user is, only what the client can do on their behalf.
- **"A refresh token is just a long-lived access token"** - a refresh token is never sent to a resource server and never grants API access directly; it only exchanges for a new access token at the AS, which is why it can be rotated and revoked independently.
- **"PKCE replaces the client secret"** - PKCE protects public clients that never had a secret to begin with; a confidential client with a server-side backend still uses its client secret, PKCE is additive hardening on top, not a substitute.

---

## Interview Scenario Bank

> 💬 **First 30 seconds:** "I'd first ask whether a human is involved and whether the client has a secure place to store a secret - that decides the grant type. Then I'd separate the authorization question (what can this client do) from the identity question (who is the user) up front, since conflating those is the most common design mistake in systems that bolt on 'login with X.'"

> 🎯 **Interview Lens**
> **Q:** A mobile app needs to let users log in with their Google account. Which flow do you use and why?
> **Ideal answer:** Authorization Code Flow with PKCE - a mobile app is a public client with no secure place to store a client secret, so PKCE's code_verifier/code_challenge pair proves the token exchange came from the same app that started the flow, without needing a secret at all.
> **Common trap:** Reaching for Implicit Flow because "it's simpler for a client without a backend" - that reasoning was valid before PKCE existed, but Implicit Flow puts the access token in the URL fragment, which is strictly worse.
> **Next question:** The app also needs a backend API to know which user is calling it - what does the mobile app send to the API, and what does the API have to validate before trusting it?

> 🎯 **Interview Lens**
> **Q:** What's the difference between an ID token and an access token, and why can't you use one for the other's job?
> **Ideal answer:** One carries identity claims and is addressed to the client; the other carries authorization scope and is addressed to the resource server. Consumer and audience differ for both - using the wrong one means either a resource server trusting a token that was never meant to prove authorization scope, or a client trusting a token that was never meant to assert identity.
> **Common trap:** Passing the access token to the client-side app and treating "I have a valid access token" as proof of who the user is.
> **Next question:** How would you get the user's profile information after login without over-relying on token contents alone?

> 🎯 **Interview Lens**
> **Q:** Your refresh token endpoint sees the same refresh token presented twice in quick succession. What does that mean, and what should the AS do?
> **Ideal answer:** Under correct rotation, a refresh token is single-use - once exchanged it's invalidated and replaced. A second presentation of an already-rotated token means it leaked and two parties are racing to use it. The AS should revoke the entire token family descended from that refresh token, not just reject the duplicate request, since the legitimate client's copy is now also compromised context.
> **Common trap:** Just rejecting the reused request and letting the legitimate client keep using its current access token - that leaves the attacker's stolen copy of the family potentially still valid up to that point.
> **Next question:** How does this change if the system uses static (non-rotating) refresh tokens instead?

> 🎯 **Interview Lens**
> **Q:** A user revokes an app's access from their Google account settings. Can that app still call the API five minutes later?
> **Ideal answer:** Possibly yes, briefly - revoking the refresh token stops future token issuance, but any access token already issued from it remains valid until it naturally expires, because most resource servers validate access tokens locally without a live revocation check. This is the direct cost of choosing short-lived, self-contained access tokens over a per-request revocation lookup.
> **Common trap:** Assuming revocation is instantaneous everywhere - it's instantaneous for the AS's own future token issuance, not for tokens already in the wild.
> **Next question:** How would you design for near-instant revocation if the product requirement demanded it, and what would that cost you architecturally?

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| OAuth | Open Authorization | Delegated-authorization protocol - a client gets scoped access without seeing user credentials |
| OIDC | OpenID Connect | Identity layer on top of OAuth 2.0 - adds the ID token and UserInfo endpoint |
| PKCE | Proof Key for Code Exchange | Extension that lets public clients use the Authorization Code flow safely without a client secret |
| AS | Authorization Server | Issues tokens after authenticating the user and obtaining consent |
| RS | Resource Server | Hosts the protected resource and validates access tokens on each request |

### Anti-patterns

- **Using the access token to establish user identity** - it proves authorization scope, not identity; use the ID token (OIDC) and validate `aud` before trusting any identity claim.
- **Storing a client secret in a public client (SPA, mobile, CLI)** - the secret is extractable from the client binary/bundle; use PKCE instead, which requires no persisted secret.
- **Static, non-rotating refresh tokens with no reuse detection** - a single leak grants indefinite renewed access with no signal to the AS that anything went wrong.
- **Skipping `state` validation on the callback** - opens the flow to CSRF and account-linkage attacks against the callback endpoint.
