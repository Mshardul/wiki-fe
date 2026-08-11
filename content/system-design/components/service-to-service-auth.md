# Service-to-Service Authentication

## Prerequisites

- **[Authentication](./authentication.md)** [Must read] - service identity is a distinct problem from user identity; the hub covers why the human-in-the-loop assumption breaks down here.
- **[mTLS](./mtls.md)** [Should read] - one of the primary mechanisms covered in depth here; this page covers when to reach for it vs. alternatives.

---

## Table of Contents

<!-- Partial article - seeded from authentication.md. Sections to be completed. -->

- [API Keys](#api-keys)
- [mTLS](#mtls)
- [JWT with Service Accounts](#jwt-with-service-accounts)
- [SPIFFE / SPIRE](#spiffe--spire)

---

## TLDR

<!-- To be written when this article is fully developed. -->

---

## API Keys

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

---

## mTLS

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

---

## JWT with Service Accounts

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

---

## SPIFFE / SPIRE

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

> 🎯 **Interview Lens**
> **Q:** How do you authenticate services in a microservices system without sharing long-lived secrets?
> **Ideal answer:** Two options depending on complexity tolerance. For a service mesh environment: mTLS with automatic cert rotation via Istio or Linkerd - identity is in the certificate, rotation is automated, no application-layer token management. For heterogeneous or multi-cloud: SPIFFE/SPIRE - platform-agnostic workload identity, short-lived X.509 SVIDs rotated automatically, no secrets in config. Both avoid the core problem with API keys: a long-lived secret that leaks silently and is painful to rotate.
> **Common trap:** "Use API keys per service." Follow-up: "How do you rotate them without downtime?" and "What happens if one is leaked?" The candidate then describes a manual process that doesn't scale past a few services.
> **Next question:** "How does a newly deployed pod prove its identity to SPIRE before it has any credentials?" → This is workload attestation. SPIRE Agent uses platform-specific evidence (Kubernetes pod UID, node metadata, service account projection) to verify the workload's claimed identity before issuing any SVID. The agent has a trusted channel to the SPIRE Server; the workload only communicates with the local agent via Unix socket.

**Key Takeaway:** API keys are the right choice for external integrations - simple, immediately revocable. For internal service mesh: mTLS with automated rotation removes long-lived secrets from the picture. SPIFFE/SPIRE is the answer when you need workload identity across heterogeneous infrastructure without per-platform credential management.
