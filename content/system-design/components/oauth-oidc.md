# OAuth 2.0 & OIDC

## Prerequisites

- **[Authentication](./authentication.md)** [Must read] - OAuth/OIDC is the delegation and federated-identity layer the hub routes to; the AuthN-vs-AuthZ distinction is assumed knowledge here.
- **[JWT](./jwt.md)** [Should read] - ID tokens and (commonly) access tokens are JWTs; token structure and signing are covered there, not repeated here.

---

## Table of Contents

<!-- Partial article - seeded from authentication.md. Sections to be completed. -->

- [Core Roles](#core-roles)
- [Which OAuth Grant Type?](#which-oauth-grant-type)
- [Authorization Code Flow + PKCE](#authorization-code-flow--pkce)
- [Client Credentials Flow](#client-credentials-flow)
- [Device Authorization Flow](#device-authorization-flow)
- [Implicit Flow - Why It's Deprecated](#implicit-flow--why-its-deprecated)
- [OpenID Connect - ID Token vs Access Token](#openid-connect--id-token-vs-access-token)
- [OAuth Is Not Authentication - The Common Confusion](#oauth-is-not-authentication--the-common-confusion)

---

## TLDR

<!-- To be written when this article is fully developed. -->

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

## Which OAuth Grant Type?

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

> ⚖️ **Decision Framework**
> The two questions that eliminate the most wrong answers in an interview: (1) "Does a human log in, or is this service-to-service?" and (2) "Does the client have a secure place to store a secret?" No secure secret storage (SPA, mobile, CLI) → PKCE is mandatory, not optional.

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

> 🎯 **Interview Lens**
> **Q:** What's the difference between an ID token and an access token in OIDC?
> **Ideal answer:** ID token tells the client who the user is - it's a JWT with identity claims (`sub`, `email`, `name`), audience set to the client's `client_id`, and a `nonce`. The client reads and validates it. Access token tells the resource server what the client is allowed to do - it carries scopes, and its audience is the API. The resource server validates it on every request. They are consumed by different parties for different purposes - never substitute one for the other.
> **Common trap:** "Use the access token to get the user's identity." This is the OAuth-as-authentication mistake - see below.
> **Next question:** "How do you get user profile information in OIDC?" → Either read claims from the ID token directly (for basic profile), or call the UserInfo endpoint with the access token for additional claims the AS didn't embed in the token.

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

> 🧠 **Thought Process**
> When you see "login with Google" in a system design, ask: what exactly is Google returning, and what are we doing with it? If the system calls `/userinfo` with the access token and trusts the response to establish identity - that's correct OIDC usage. If it's using the access token itself as proof of identity (passing it between internal services, storing it as a session credential) - that's the OAuth-as-auth mistake. The interview signal: a strong candidate knows why `aud` exists and can explain what attack it prevents.

**Key Takeaway:** OAuth is authorization, not authentication. OIDC is the identity layer on top. The `aud` claim is the load-bearing security check that separates correct OIDC from exploitable OAuth-as-auth. In all multi-party flows, validate `aud`, `iss`, `nonce`, and `exp` on every ID token.
