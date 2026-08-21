# Service-to-Service Authentication

## Prerequisites

- **[Authentication](./authentication.md)** [Must read]
- **[mTLS](./mtls.md)** [Should read]
- **[JWT](./jwt.md)** [Should read]

---

## Table of Contents

- [Core Mechanisms](#core-mechanisms)
- [API Keys](#api-keys)
- [mTLS](#mtls)
- [JWT with Service Accounts](#jwt-with-service-accounts)
- [SPIFFE / SPIRE](#spiffe--spire)
- [Quick Decision Guide](#quick-decision-guide)
- [Comparison Matrix](#comparison-matrix)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

Service-to-service auth answers a different question than user auth: not "who is this person" but "which workload is calling, and can I prove it without a human typing a password." The four workhorse mechanisms - API keys, mTLS, JWT service accounts, and SPIFFE/SPIRE - trade off setup cost against credential lifetime and blast radius on leak. The real decision isn't which mechanism is "best," it's how much long-lived secret material you're willing to have sitting in a config file. **Soundbite:** the mechanisms aren't ranked, they're layered - external partners get API keys, your mesh gets mTLS, and the hard part is never the crypto, it's who rotates the secret before someone else does.

---

## Core Mechanisms

Four mechanisms cover the overwhelming majority of service-identity problems in practice, each solving a different trust topology.

### API Keys

An API key is a shared secret the client includes in every request. The server looks it up against a store to identify and authorize the caller.

```
GET /api/v1/reports
Authorization: Bearer sk_live_<secret>
# or
X-API-Key: sk_live_<secret>
```

**Prefixes for scannable detection:** Prefix keys with a recognizable string (`sk_live_`, `ghp_`, `npm_`). GitHub, Stripe, and npm use this pattern. Allows automated scanning of source code and commit history to detect accidental key exposure - and immediately revoke before damage is done.

**Storage:** Store only the hash (SHA-256) of the key. On verification, hash the received key and compare. If the store is breached, attackers get hashes, not usable keys.

```python
import hashlib, secrets

def create_api_key():
    raw_key = "sk_live_" + secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    db.store({"hash": key_hash, "scope": "reports:read", "created_at": now()})
    return raw_key   # shown to user once, never stored again

def verify_api_key(raw_key):
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    return db.find_by_hash(key_hash)
```

**Rotation without downtime:** Support two active keys per credential at any time. The caller generates a new key, adds it alongside the old one, migrates services, then revokes the old key. Immediate revocation on compromise is still possible - delete the key record.

**Limitations:** No built-in expiry, no cryptographic proof of who is calling (only that they have the key), no fine-grained identity beyond what the key record says. Appropriate for third-party external integrations and webhook endpoints. Not appropriate for internal service mesh traffic where better options exist.

### mTLS

Standard TLS authenticates the server to the client - the server presents a certificate and the client verifies it. mTLS (mutual TLS) adds the reverse: the client also presents a certificate, and the server verifies it. Both sides prove their identity during the TLS handshake.

```
Client                              Server
  │── ClientHello ────────────────▶ │
  │◀─ ServerHello + ServerCert ──── │
  │── ClientCert + Finished ──────▶ │  ← client proves its identity
  │◀─ Finished ───────────────────  │
  │                                 │
  │  Mutual authentication complete │
  │  Application data encrypted     │
```

The server validates the client certificate against its trusted CA. The certificate encodes the client's identity (Common Name or Subject Alternative Name). No API keys, no tokens - identity is established at the connection layer before any application code runs.

**The operational challenge is PKI** - running a CA, issuing short-lived certs, rotating before expiry, revoking on decommission. In practice, service meshes (Istio, Linkerd) automate this entirely: each sidecar proxy gets a cert issued by the mesh CA, rotated transparently, without any application-layer TLS code. For PKI lifecycle, CRL/OCSP, and service mesh integration details, see [mTLS](./mtls.md).

> ⚖️ **Decision Framework**
> mTLS is the right choice when: you control both sides of the connection, you're operating a service mesh or can add one, and you want transport-level identity without application-layer token management. Without automation (cert-manager, Istio), manual cert rotation across many services is the failure mode - the operational burden defeats the security benefit.

### JWT with Service Accounts

Service accounts are non-human identities tied to a service or workload. A service authenticates by presenting a signed JWT that asserts its identity, which an authorization server or target service validates. (See [JWT](./jwt.md) for token structure and signing algorithm trade-offs - not repeated here.)

**Google Cloud Platform pattern:**

```
1. GCP creates a service account: my-service@project.iam.gserviceaccount.com
2. Service downloads a key file (JSON with private key)
   - or - uses Workload Identity (preferred: no key file)

3. Service constructs and signs a JWT:
   {
     "iss": "my-service@project.iam.gserviceaccount.com",
     "sub": "my-service@project.iam.gserviceaccount.com",
     "aud": "https://target-api.example.com",
     "iat": 1700000000,
     "exp": 1700003600
   }
   signed with the service account's private key

4. Target service fetches Google's public keys (JWKS) and validates the signature
```

**Kubernetes ServiceAccount tokens:**

Kubernetes projects an OIDC-compatible token into each pod at a known path:

```
/var/run/secrets/kubernetes.io/serviceaccount/token
```

The token is automatically rotated by the kubelet. Services read it and present it to other services or the Kubernetes API. With IAM Roles for Service Accounts (IRSA on AWS, Workload Identity on GCP), the pod's Kubernetes identity is federated to a cloud IAM role - the pod gets cloud credentials without storing any key material.

The key pattern: no long-lived secrets embedded in the process. Credentials are short-lived, rotated automatically by the platform, and tightly scoped.

### SPIFFE / SPIRE

_Platform-agnostic workload identity: each service gets a cryptographic SVID automatically, rotated continuously, with no secrets in config files._

SPIFFE (Secure Production Identity Framework For Everyone) is a CNCF standard for workload identity in heterogeneous infrastructure. SPIRE (SPIFFE Runtime Environment) is the reference implementation.

**Problem it solves:** In a dynamic environment (Kubernetes pods, EC2 instances, Lambda functions), services come and go. Assigning and rotating credentials manually doesn't scale. SPIFFE provides a cryptographic identity to each workload automatically, regardless of the underlying platform.

**SPIFFE ID:** A URI that uniquely identifies a workload:

```
spiffe://trust-domain/path/to/workload

Examples:
spiffe://payments.example.com/frontend
spiffe://payments.example.com/db-writer
```

**SVID (SPIFFE Verifiable Identity Document):** The credential that encodes a SPIFFE ID. Two formats:

- **X.509-SVID:** A TLS certificate with the SPIFFE ID in the Subject Alternative Name URI field. Used for mTLS between workloads.
- **JWT-SVID:** A short-lived JWT with the SPIFFE ID as the `sub` claim. Used for HTTP-based authentication.

**How SPIRE works:**

```
SPIRE Server  ←─ operator configures workload attestation rules
     │
     │  (trust domain CA, issues SVIDs)
     │
SPIRE Agent   ←─ runs on each node (DaemonSet in k8s)
     │
     │  workload attestation: verifies the process
     │  (checks: this is pod X in namespace Y with label Z)
     │
Workload      ←─ fetches SVID via Workload API (Unix socket)
     │              SVID is auto-rotated before expiry
     ▼
Presents X.509-SVID in mTLS handshake to target service
Target fetches SPIFFE bundle (public keys) from SPIRE and validates
```

**Key properties:**

- Short-lived SVIDs (hours, not days) automatically rotated - compromise window is narrow
- Platform-agnostic: works across Kubernetes, VMs, bare metal, Lambda
- No secrets in environment variables or config files - credentials delivered via local socket
- Integrates with Envoy, Istio, and AWS/GCP workload identity

---

## Quick Decision Guide

Choose based on **who controls the other side of the connection** and **how dynamic the fleet is** - not on which mechanism sounds most modern.

- **External third party, webhook, or partner integration** → API keys. You don't control their infrastructure, so certificate-based or platform-native identity isn't an option - a scoped, revocable shared secret is the only mechanism both sides can implement without coordination.
- **Internal traffic inside a single service mesh you operate** → mTLS via the mesh's sidecar (Istio, Linkerd). The mesh automates PKI; you get transport-level identity for free without touching application code.
- **Calling a specific cloud provider's managed API (Cloud Storage, Pub/Sub, a managed queue)** → JWT service accounts / workload identity federation (Workload Identity on GCP, IRSA on AWS). The provider already expects this exact mechanism, and it eliminates key files in favor of platform-issued short-lived credentials.
- **Heterogeneous or multi-cloud fleet** (mix of Kubernetes, VMs, bare metal, serverless) where no single mesh spans everything → SPIFFE/SPIRE. It's the only option here that isn't tied to one platform's identity model.
- **Not sure yet / early-stage system with one or two services** → start with API keys for simplicity, but budget for migration once service count or blast-radius concerns grow - retrofitting mTLS or SPIFFE across dozens of already-deployed services is materially harder than starting with one.

**Cost is a secondary factor, not a primary one, here.** Running your own CA (mTLS without a mesh) or a SPIRE Server/Agent deployment costs operational effort more than dollars - the "cost" that actually differentiates these options is engineering time spent on PKI lifecycle and rotation automation, not a cloud bill line item.

**Real-world usage and scale:** Google's internal ALTS and Netflix's use of mTLS-via-mesh are workhorse examples of transport-level service identity at large fleet scale. What breaks past a few thousand services isn't the crypto - it's CA availability: a mesh-wide cert rotation event that coincides with a CA outage can lock out an entire fleet from re-authenticating simultaneously, which is why production mTLS deployments run redundant CAs and stagger rotation windows rather than rotating the whole fleet at once.

---

## Comparison Matrix

| Dimension | API Keys | mTLS | JWT Service Accounts | SPIFFE/SPIRE |
| --- | --- | --- | --- | --- |
| Trust model | Shared secret | Certificate (PKI) | Signed token, platform-issued | Cryptographic identity (SVID) |
| Credential lifetime | Long-lived (manual rotation) | Short-lived if automated | Short-lived (platform-rotated) | Short-lived (hours), auto-rotated |
| Setup cost | Very low | High without a mesh; low with one | Low if platform-native (GCP/AWS) | High (SPIRE Server/Agent deployment) |
| Cross-platform | Yes, trivially | Tied to whoever runs the mesh | Tied to the issuing cloud platform | Yes, by design |
| Blast radius on leak | High - full access until manually revoked | Low - narrow validity window | Low - narrow validity window | Very low - hours-long window, auto-revoked |
| Best fit | External partners, webhooks | Internal mesh traffic | Calls to a specific cloud provider's APIs | Heterogeneous/multi-cloud fleets |

**Pick it when:** reach for API keys only where you don't control both ends of the connection; everything internal that can run a mesh or SPIRE should not still be using shared secrets in year two.

---

## Production Failure Modes & Gotchas

- **API key sprawl with no owner.** Keys get generated for a one-off integration and never revoked when the integration is decommissioned. Without a scoped, tagged key registry, dead keys become permanent unmonitored attack surface.
- **mTLS cert expiry cascades.** If cert rotation isn't automated (cert-manager, mesh-managed), certs expire silently and take down every dependent service at once - usually discovered in production, not staging, because staging traffic is lighter and masks the expiry window.
- **CA outage during a rotation window.** A mesh-wide rotation that coincides with CA unavailability can lock services out of re-authenticating simultaneously - see the at-scale note in the Quick Decision Guide.
- **JWT service account key files committed to source control.** The GCP/AWS key-file pattern is a long-lived secret exactly like an API key if it's exported to a file instead of using Workload Identity/IRSA federation - a common accidental regression.
- **SPIRE workload attestation misconfiguration.** If attestation rules are too permissive (e.g. matching on namespace alone, not label + service account + namespace together), a compromised pod in the same namespace can obtain another workload's SVID.
- **Clock skew breaking JWT validation.** Short-lived tokens (JWT service accounts, JWT-SVIDs) are exquisitely sensitive to clock drift between issuer and verifier - a few minutes of skew produces spurious "expired" or "not yet valid" rejections that look like an auth bug but are actually an NTP problem.

### Common Misconceptions

- **"mTLS means the traffic is authorized."** mTLS proves *identity* (this connection came from certificate X) - it says nothing about *authorization* (whether X is allowed to call this specific endpoint). Authorization is a separate policy layer on top.
- **"API keys and JWTs are interchangeable as long as both are 'tokens'."** An API key is an opaque shared secret verified by lookup; a JWT is a self-contained signed claim verified by signature. The failure modes are different - a leaked API key is usable until revoked in the store, a leaked JWT is usable until its `exp` passes, no revocation required (or possible, without a denylist).
- **"SPIFFE/SPIRE replaces mTLS."** SPIFFE is an identity framework; X.509-SVIDs are still presented *via* mTLS. SPIRE issues and rotates the certificates that mTLS then uses - it's not a competing mechanism, it's what feeds mTLS in a platform-agnostic way.

---

## Interview Scenario Bank

> The first 30 seconds: "Before picking a mechanism, I'd ask who's on the other end of this connection - a third party I don't control, or infrastructure I own. That decides whether this is an API-key problem or a mesh/workload-identity problem, and it's the fork everything else hangs off."

> 🎯 **Interview Lens**
> **Q:** How do you authenticate services in a microservices system without sharing long-lived secrets?
> **Ideal answer:** It depends on who controls the other side. For a service mesh you operate: mTLS with automatic cert rotation via Istio or Linkerd - identity is in the certificate, rotation is automated, no application-layer token management. For heterogeneous or multi-cloud infrastructure: SPIFFE/SPIRE - platform-agnostic workload identity, short-lived X.509 SVIDs rotated automatically, no secrets in config. Both avoid the core problem with a naive shared-secret approach: a long-lived credential that leaks silently and is painful to rotate.
> **Common trap:** "Use API keys per service" as the universal answer, without distinguishing internal mesh traffic from external partner traffic.
> **Next question:** How do you rotate a credential across a fleet with zero downtime, without ever having both old and new fully invalid at the same time?
> **Next question:** What happens if the store or CA that issues these credentials becomes unavailable mid-rotation?

> 🎯 **Interview Lens**
> **Q:** A newly deployed pod needs to call another service - how does it prove its identity before it holds any credential at all?
> **Ideal answer:** This is workload attestation. An agent running on the node (e.g. SPIRE Agent) verifies platform-specific evidence about the calling process - pod UID, namespace, service account, node metadata - through a trusted channel it already has to the platform, and only then issues a credential to the workload over a local, unauthenticated-by-design channel (a Unix socket the workload alone can reach).
> **Common trap:** Assuming the workload itself presents some pre-existing secret to bootstrap trust - the whole point is that it doesn't have one yet; trust comes from the platform's own attestation of *what* the workload is, not anything the workload possesses.
> **Next question:** If the attestation rule matches on namespace alone, what does a compromised neighbor pod in that namespace gain?

> 🎯 **Interview Lens**
> **Q:** Your service calls a managed cloud API (object storage, a managed queue) - what's the credential, and why not just use an API key here too?
> **Ideal answer:** Use the platform's native workload identity federation (Workload Identity on GCP, IRSA on AWS) rather than a downloaded service-account key file. The workload's platform-native identity (its Kubernetes service account, its instance identity) gets federated to a cloud IAM role, so the credential is short-lived and platform-rotated instead of a static key file that behaves exactly like a leaked API key if exfiltrated.
> **Common trap:** Downloading and embedding the service-account JSON key file because it "just works" in a tutorial, then accidentally committing it or baking it into an image layer.
> **Next question:** If the key file did end up in source control history, what's the actual blast radius, and how would you detect it happened?

> 🎯 **Interview Lens**
> **Q:** Why is mTLS not sufficient on its own to say a request is allowed?
> **Ideal answer:** mTLS authenticates the connection's identity at the transport layer - it proves which certificate, and therefore which workload, is on the other end. It does not encode or enforce what that identity is permitted to do. Authorization is a separate policy decision (an AuthorizationPolicy in the mesh, an ACL, a scope check) layered on top of the proven identity.
> **Common trap:** Treating "the handshake succeeded" as equivalent to "this call is allowed," which conflates authentication with authorization.
> **Next question:** Where would you enforce that policy - at the sidecar, at the application, or both, and what's the trade-off?

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| mTLS | Mutual Transport Layer Security | Both client and server present certificates during the TLS handshake |
| JWT | JSON Web Token | Signed, self-contained token asserting claims about an identity |
| SPIFFE | Secure Production Identity Framework For Everyone | CNCF standard for automatic workload identity |
| SPIRE | SPIFFE Runtime Environment | Reference implementation of SPIFFE |
| SVID | SPIFFE Verifiable Identity Document | The credential (X.509 or JWT) encoding a SPIFFE ID |
| PKI | Public Key Infrastructure | The CA, cert issuance, and revocation machinery behind certificate-based auth |
| IRSA | IAM Roles for Service Accounts | AWS mechanism federating a Kubernetes service account to a cloud IAM role |
| CRL | Certificate Revocation List | List of certificates a CA has revoked before their expiry |
| OCSP | Online Certificate Status Protocol | Real-time alternative to CRL for checking certificate revocation status |

### Anti-patterns

- Embedding a downloaded service-account key file in a container image or committing it to source control - use workload identity federation instead, which issues no static file at all.
- Running mTLS certificate rotation manually across more than a handful of services - the operational burden guarantees an eventual expiry outage; automate via a mesh or cert-manager before scaling past a few services.
- Treating API keys as suitable for internal service mesh traffic because they're "simple" - internal traffic is exactly the case where a better, short-lived mechanism is available and worth the setup cost.
- Configuring SPIRE workload attestation on a single loose attribute (namespace only) - combine namespace, service account, and pod labels so a neighboring compromised workload can't inherit another's identity.
