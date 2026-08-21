# Load Balancer TLS Handling

## Prerequisites

- **[Load Balancer](./load-balancer.md)** [Must read]
- **TLS/HTTPS** [Must read] <!-- link: ../components/tls.md -->

---

## Table of Contents

- [Conceptual Foundations & Mental Models](#conceptual-foundations--mental-models)
- [Termination at LB (Offload)](#termination-at-lb-offload)
- [SSL Passthrough](#ssl-passthrough)
- [Re-encryption (LB to Backend TLS)](#re-encryption-lb-to-backend-tls)
- [Certificate Management & Rotation at Scale](#certificate-management--rotation-at-scale)
- [Mutual TLS (mTLS)](#mutual-tls-mtls)
- [Quick Decision Guide](#quick-decision-guide)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

TLS is computationally expensive, and the load balancer sits at the exact point where you decide who pays that cost - the LB, the backend, or both. Terminating at the LB is the default: it's simple, backends stay dumb, and the LB can inspect HTTP for L7 routing. Re-encrypting to the backend keeps end-to-end encryption but doubles the handshake cost, which regulated environments accept and most systems don't need. Say it out loud: the SSL/TLS mode you pick at the LB isn't really a security decision first, it's a decision about who does the decrypting and what that buys or costs you in routing capability and CPU.

---

## Conceptual Foundations & Mental Models

**Interviewer TL;DR:** Terminate at the LB for simplicity; re-encrypt if compliance demands E2E encryption - but you're paying two TLS handshakes per request.

**Mental model:** TLS is computationally expensive. The question is _where_ you pay that cost - at the LB, at the backend, or both.

**Why this exists:** TLS (Transport Layer Security) encrypts traffic between two parties and verifies identity via certificates. Before any data flows, the client and server perform a **handshake**: they exchange cryptographic keys, the server presents its certificate, and they agree on a cipher. This handshake takes 1–2 network round trips and is CPU-intensive - especially the asymmetric key exchange (RSA or ECDHE).

The LB sits in the middle of every connection. This creates a fundamental question: does the LB decrypt the traffic, or does it pass the encrypted stream through untouched? The answer determines what the LB can and can't do:

| Mode                | Who decrypts         | LB can do L7 routing? | Backend needs TLS config? | E2E encrypted?             |
| ------------------- | --------------------- | ----------------------- | ---------------------------- | ----------------------------- |
| **Terminate at LB** | LB                    | Yes                      | No                            | No (LB → backend is plain)     |
| **Passthrough**     | Backend                | No (L4 only)             | Yes                            | Yes                            |
| **Re-encrypt**      | LB, then re-encrypts | Yes                      | Yes                            | Yes                            |

The right choice depends on your security posture and routing needs. Most systems use termination at LB - it's simpler and fast. Regulated environments (PCI-DSS, HIPAA) often require re-encryption.

---

## Termination at LB (Offload)

The LB handles the TLS handshake with the client. Traffic between the LB and backend is unencrypted (or travels over a trusted internal network).

**Advantages:** Backends are simpler - no TLS config needed. LB can inspect HTTP content (required for L7 routing, sticky sessions). TLS termination is hardware-accelerated on dedicated LBs.

**Disadvantages:** LB → backend traffic is unencrypted. Acceptable in a trusted VPC; unacceptable in zero-trust or regulated environments.

---

## SSL Passthrough

The LB forwards the encrypted TCP stream directly to the backend without decrypting it. The backend handles TLS.

**Advantages:** End-to-end encryption. LB doesn't need access to certificates.

**Disadvantages:** LB operates at L4 only - cannot inspect HTTP content, implement cookie-based stickiness, or route based on URL or headers.

---

## Re-encryption (LB to Backend TLS)

The LB terminates TLS from the client (to inspect and route), then opens a _new_ TLS connection to the backend.

**Advantages:** Full L7 inspection capability + end-to-end encryption.

**Disadvantages:** Two TLS handshakes per request. Certificate management at both LB and backend. Performance cost.

**Use case:** PCI-DSS, HIPAA, or other regulated environments where data must be encrypted in transit even on internal networks.

---

## Certificate Management & Rotation at Scale

At scale, certificates must be rotated without downtime:

- Use ACME protocol (Let's Encrypt) for automated renewal.
- Store certificates in a secrets manager (Vault, AWS Secrets Manager).
- LBs must support hot certificate reload without dropping connections.
- SNI (Server Name Indication) enables one LB to serve multiple domains with separate certificates on a single IP.

---

## Mutual TLS (mTLS)

In standard TLS, only the server presents a certificate - the client is anonymous. In mTLS, **both** parties present certificates, so identity is proven at the network layer before any application code runs. At the load balancer, this means the LB validates the client's certificate before forwarding the request, and enforces mTLS for inter-service traffic in a zero-trust architecture - a service without a valid certificate cannot connect, regardless of whether it's inside the VPC.

The full mechanics - handshake flow, PKI management, certificate issuance/rotation/revocation, service mesh integration - live on the dedicated mTLS page.

🔗 Deep-Dive: [Mutual TLS (mTLS)](./mtls.md) - Handshake, PKI management, certificate lifecycle, service mesh.

---

## Quick Decision Guide

```
SSL strategy at the LB?
  ├─ Compliance requires E2E encryption ──▶ Re-encryption mode (→ #re-encryption-lb-to-backend-tls)
  ├─ Standard web traffic, trusted internal network ──▶ Terminate at LB (→ #termination-at-lb-offload)
  └─ Need E2E encryption but LB shouldn't decrypt (mTLS passthrough) ──▶ SSL Passthrough (→ #ssl-passthrough)
```

**Real-world usage:** AWS ALB and nginx default to termination at the LB for standard web traffic; Envoy in a service mesh typically re-encrypts with mTLS to the backend. At scale, the failure mode isn't the mode you picked - it's the CPU cost of full handshakes under a connection-rate spike, since asymmetric key exchange doesn't parallelize away for free (see [SSL Handshake CPU Saturation at Scale](#ssl-handshake-cpu-saturation-at-scale)).

---

## Production Failure Modes & Gotchas

**Interviewer TL;DR:** TLS handshakes are CPU-bound, and a connection-rate spike turns that CPU cost into a death spiral if session resumption isn't enabled.

### SSL Handshake CPU Saturation at Scale

**Scenario:** Traffic spike causes a surge in new TLS connections. TLS handshakes are CPU-intensive (RSA key exchange especially). LB CPU saturates → handshakes queue → connection timeouts → clients retry → more handshakes → death spiral.

**Detection:** LB CPU at 100% correlating with new connection rate spike. TLS handshake latency P99 climbing.

**Fix:** TLS session resumption (clients reuse session tickets → no full handshake). ECDHE cipher suites (faster than RSA). Prefer TLS 1.3 (fewer round trips). Hardware TLS acceleration. Scale out LB instances horizontally.

**TLS 1.3 0-RTT (Early Data):** TLS 1.3 introduces 0-RTT resumption - a returning client can send application data in the very first packet, with zero additional round trips. This is the maximum CPU saving on resumption. However, 0-RTT data is **replayable** - an attacker who captures the first packet can replay it to trigger the same server action again. This makes 0-RTT unsafe for any non-<abbr>idempotent</abbr> request (POST, payment submissions, state-changing API calls). Only enable 0-RTT for genuinely idempotent, replay-safe endpoints (e.g., GET requests for public content). Most LBs allow 0-RTT to be configured per-route.

> **⚠️ Common Traps & How to Recover**
>
> - **Trap:** Scaling out backend servers when LB CPU is the bottleneck - adds capacity where it isn't needed. **Recovery:** Check LB CPU first; scale LB instances before touching backends.
> - **Trap:** Not enabling TLS session resumption - leaving the biggest CPU win on the table. **Recovery:** Enable session tickets in LB config; verify with `openssl s_client -reconnect` that resumption is working.
> - **Trap:** Using RSA 4096 for "extra security" - 4x the CPU cost of RSA 2048 with negligible security gain. **Recovery:** Switch to ECDHE (P-256) which is faster and more secure than RSA 2048.

### Common Misconceptions

- **"Re-encryption is always more secure, so always do it"** - it doubles handshake cost for a benefit (protecting an already-trusted internal network) that many deployments don't need; the right call depends on the threat model, not a blanket "more encryption is better."
- **"mTLS is only for external traffic"** - the actual point of mTLS in zero-trust is east-west traffic; external-only mTLS leaves internal lateral movement wide open.

**Key Takeaway:** SSL CPU saturation looks like a capacity problem but is usually a configuration problem - session resumption and ECDHE fix most of it before you need to scale out.

---

## Interview Scenario Bank

### Choosing Where to Terminate TLS

> 🎯 **Interview Lens**
> **Q:** Your system needs to route based on URL path, but compliance requires traffic to be encrypted all the way to the backend - how do you reconcile that?
> **Ideal answer:** Terminate the client connection to inspect and route on the URL, then open a new encrypted connection to the backend - accepting the cost of a second handshake per request as the price of both requirements.
> **Common trap:** Picking passthrough because "it's fully encrypted" - passthrough is L4 only and can't see the URL at all, so it can't satisfy the routing requirement.
> **Next question:** How would you reduce the cost of that second handshake at high connection rates? → Session resumption and connection pooling between the LB and backend so the second handshake isn't paid per client request.

### Handshake CPU Under Load

> 🎯 **Interview Lens**
> **Q:** Traffic to your HTTPS endpoint spikes 10x and the load balancer's CPU pegs at 100% while backends stay idle - what's happening and what do you check first?
> **Ideal answer:** New TLS handshakes are CPU-bound (especially the asymmetric key exchange), so a burst of new connections saturates the LB before it saturates any backend. Check whether session resumption is enabled and whether the cipher suite is ECDHE vs RSA before scaling anything out.
> **Common trap:** Assuming backend capacity is the bottleneck and scaling out backends, which does nothing because the backends were never the constraint.
> **Next question:** Retries from timed-out clients are now making it worse - what's your circuit breaker here? → Shed new connections early (reject or queue with a depth limit) rather than let unbounded retries compound the CPU saturation into a full outage.

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| ------- | --------- | ------------------ |
| SNI     | Server Name Indication | Lets one LB serve multiple domains with separate certs on one IP |
| ALPN    | Application-Layer Protocol Negotiation | TLS extension that negotiates HTTP/1.1 vs HTTP/2 during the handshake |
| RTT     | Round Trip Time | Network latency unit; TLS 1.3 0-RTT skips this on resumption |
| PCI-DSS | Payment Card Industry Data Security Standard | Compliance regime often requiring E2E encryption |

### Anti-Patterns

- **Deep-linking passthrough with L7 routing requirements** - passthrough can't inspect HTTP content at all; if routing needs to see the URL or headers, passthrough is architecturally incompatible.
- **RSA 4096 "for extra security"** - four times the CPU cost of RSA 2048 with negligible real-world security gain; ECDHE is both faster and stronger.
- **Skipping TLS session resumption** - leaves the largest and cheapest CPU win on the table, directly increasing exposure to handshake-saturation death spirals under load.
