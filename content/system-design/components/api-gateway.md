# API Gateway

## Prerequisites

- **[Load Balancer](./load-balancer.md)** [Must read]
- **[Authentication](./authentication.md)** [Should read]

## Table of Contents

- [Core Mechanisms](#core-mechanisms)
- [Quick Decision Guide](#quick-decision-guide)
- [Comparison / Selection Matrix](#comparison--selection-matrix)
- [Security & Hardening](#security--hardening)
- [Performance & Optimization](#performance--optimization)
- [Resilience & Failure Handling](#resilience--failure-handling)
- [Deployment Contexts](#deployment-contexts)
- [Observability & Debugging](#observability--debugging)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

An API gateway is the single entry point that sits between clients and a microservices backend, doing at the edge what every service would otherwise duplicate: routing, authentication, rate limiting, and response aggregation. Its core value is centralizing cross-cutting concerns so individual services stay focused on business logic - the cost is a new critical-path hop and, if misused for business logic, a distributed monolith hiding behind one URL. The gateway itself becomes a single point of failure unless deployed HA, and its biggest production risk isn't routing - it's silently absorbing so much request-shaping logic that a config change becomes a deploy-and-pray event for every service behind it.

## Core Mechanisms

**Mental model:** a hotel concierge desk - every guest request goes through the desk first; the desk verifies who you are, decides which department handles it, and sometimes assembles an answer from three departments before you ever see it. The desk doesn't do housekeeping or room service itself.

An API gateway is an L7 reverse proxy specialized for API traffic: it terminates the client connection, inspects the request, and applies a pipeline of edge-level policies before forwarding to a backend service. What distinguishes it from a plain [load balancer](./load-balancer.md) is the pipeline - a load balancer's job ends at "which healthy backend gets this connection"; a gateway's job is everything that happens to the request *before* that routing decision, and often after the response comes back too.

### Request Pipeline

Every request passes through an ordered chain of concerns. The order matters - authentication must resolve identity before rate limiting can key on user ID, and routing must happen before any backend-specific transformation:

```
Client
  │
  ▼
[TLS Termination] → [Authentication] → [Rate Limiting] → [Routing] → [Transformation] → Backend Service
                                                                            │
                                                                            ▼
                                                                  [Response Transformation] → Client
```

Each stage is a discrete, swappable policy - most gateways implement this as a plugin/filter chain (Kong plugins, Envoy filters, AWS API Gateway's request/response mapping templates) so operators compose behavior via config rather than code.

### Routing

The gateway inspects the request path, host header, or method and maps it to a backend service - conceptually identical to L7 [load balancer](./load-balancer.md#l4-vs-l7---where-in-the-stack-interception-happens) URL-based routing, but the gateway typically owns a much larger routing table spanning dozens to hundreds of services rather than one pool of interchangeable backend replicas.

```
/users/**      → user-service
/orders/**     → order-service
/payments/**   → payment-service  (also gets stricter rate limits + mTLS to backend)
```

**Path-based** routing (`/users/*` → user-service) is the default for REST-style APIs. **Header/host-based** routing supports multi-tenant SaaS (`tenant-a.api.example.com` → tenant-a's isolated backend pool) or API versioning (`Accept: application/vnd.api.v2+json`). Once matched, the gateway proxies to the target service's own load balancer or service-discovery endpoint - the gateway routes to a *service*, the service's own LB or service discovery layer routes to a specific *instance*.

### Authentication & Authorization at the Edge

The gateway is the natural place to terminate authentication once, rather than every service re-implementing token validation. Full mechanics of session vs JWT vs OAuth live in [Authentication](./authentication.md) - the gateway's specific job is validating the credential and forwarding identity downstream, not choosing the auth mechanism.

**Pattern:** the gateway verifies a JWT's signature (local, no database call - see [Authentication § Stateful vs Stateless](./authentication.md#stateful-vs-stateless--the-central-decision)) or validates a session cookie against a shared store, then injects the resolved identity into internal headers before forwarding:

```
Client → Authorization: Bearer <jwt> → [Gateway verifies signature]
                                              │
                                              ▼
Gateway → X-User-Id: usr_8f2a  X-User-Roles: admin,billing → Backend Service
```

Backend services trust these injected headers *only* because the network guarantees requests can't reach them except through the gateway (see [Gateway Bypass](#gateway-bypass---trusting-forwarded-identity-without-enforcement) below) - this is a network-enforced trust boundary, not a cryptographic one, and it is the single most common gateway security defect when that boundary isn't actually enforced.

> ⚖️ **Decision Framework**
> Terminate auth at the gateway when every backend needs the same identity check and none need raw credential access. Push auth into a specific service only when that service has auth requirements the gateway can't express (step-up MFA on one sensitive endpoint, a legacy service with its own identity model mid-migration).

### Rate Limiting at the Edge

The gateway is the default enforcement point for rate limiting precisely because it sees all traffic before any backend does - full algorithm mechanics, distributed counting, and response-header design are covered in [Rate Limiter § Placement in the Stack](./rate-limiter.md#api-gateway); this section only covers what's gateway-specific.

The gateway's limitation here is real: it has HTTP-layer context (headers, JWT claims, IP) but not application state. "This user has 1000 requests shared across every endpoint they call" is expressible at the gateway. "This user has 1000 requests remaining on their current billing cycle, checked against a subscription table" is not, without the gateway calling back into a service - which defeats the purpose. See [Rate Limiter](./rate-limiter.md) for the full gateway-vs-per-service trade-off table.

### Request & Response Transformation

The gateway can rewrite requests and responses in flight - the mechanism that lets backend services evolve independently of what clients expect.

- **Protocol translation:** client speaks REST/JSON, backend speaks gRPC or SOAP. The gateway transcodes.
- **Header manipulation:** strip internal headers before they leak to the client (`X-Internal-Trace-Id`), inject headers backends need (`X-Request-Id`, resolved identity).
- **Payload reshaping:** map a client-facing field name to an internal one, strip fields a mobile client doesn't need to save bandwidth, or version-adapt a v1 client's request shape to a v2 backend contract.
- **Response aggregation (API composition):** a single client request fans out to multiple backend services and the gateway merges results into one response - covered in depth next, since it's the most interview-relevant edge-composition pattern.

```json
// Client sends (v1 contract)
{ "user": "8f2a", "qty": 2 }

// Gateway transforms to backend's v2 contract
{ "userId": "usr_8f2a", "quantity": 2, "requestedAt": "2026-08-15T10:00:00Z" }
```

> ⚠️ **Warning / Gotcha**
> Transformation logic is easy to over-invest in. A gateway that reshapes payloads with conditional business rules ("if user is on the legacy plan, rename this field and default that one") has become a place where business logic hides outside version control review paths most engineers actually look at. Keep transformation mechanical (renaming, protocol translation, header injection) - the moment it encodes a business rule, that rule belongs in a service.

### API Composition & Backend-for-Frontend (BFF)

**API composition:** the gateway (or a dedicated aggregation layer) fans a single client request out to N backend services in parallel and merges the responses before replying. A mobile app's "product page" request might need product details, inventory, reviews, and price - four services - but the client wants one round trip.

```
Client: GET /products/42/full
              │
              ▼
        [Gateway fans out in parallel]
         ┌────────┼────────┬─────────┐
         ▼        ▼        ▼         ▼
   product-svc  inventory-svc  review-svc  price-svc
         │        │        │         │
         └────────┴────────┴─────────┘
              │ (merge, await all or timeout)
              ▼
        Client ← { product, stock, reviews, price }
```

The composition point must decide what to do when one of N calls fails or times out - return a partial response with the failed field omitted (graceful degradation), or fail the whole request. This decision belongs to the gateway/BFF layer, not to any single backend service, because only the aggregation point can see the full fan-out.

**Backend-for-Frontend (BFF):** rather than one generic gateway serving mobile, web, and third-party clients identically, each client type gets its own thin aggregation layer tuned to its needs - a mobile BFF returns smaller payloads and pre-aggregates more aggressively (fewer round trips matter more on cellular); a web BFF can afford chattier calls. BFFs typically sit *behind* a shared outer gateway that still owns auth/rate-limiting/TLS, with the BFF owning only aggregation and response shaping for its client type.

> ⚖️ **Decision Framework**
> One generic gateway response shape works while client needs are similar. Once mobile and web diverge meaningfully (mobile wants 5 fields, web wants 40; mobile needs 3 fan-out calls merged, web renders them separately), a BFF per client type avoids one endpoint accumulating conditional logic for every consumer. The trade-off is N BFFs to operate instead of one gateway config.

## Quick Decision Guide

### Gateway vs Load Balancer vs Service Mesh

The three are complementary, not competing - each owns a different traffic direction and a different depth of policy:

| Need | Reach for |
| --- | --- |
| Distribute connections across replicas of one service | [Load Balancer](./load-balancer.md) |
| Single entry point for external clients: auth, routing, rate limiting, aggregation | API Gateway |
| Policy (mTLS, retries, circuit breaking) between internal services, east-west | Service mesh sidecar |
| A microservices system serving external clients | All three, layered - gateway at the edge, LB per service, mesh internally |

```
Internet → [API Gateway] → [Load Balancer per service] → [Service instance]
                                      ↑
                          [Service Mesh handles east-west
                           traffic between services]
```

### When to Introduce a Gateway

| Signal | Reach for a gateway? |
| --- | --- |
| Single monolith, one client type | No - added hop with no payoff |
| 3+ microservices, one or more external client types | Yes - centralizing auth/rate-limiting pays for itself immediately |
| Multiple client types with divergent payload needs (mobile vs web vs partner API) | Yes, likely with BFFs per client type |
| Pure internal service-to-service traffic, no external clients | No - a service mesh solves internal cross-cutting concerns better than routing everything through an edge gateway |

**Where $ genuinely differentiates the choice:** a managed gateway (AWS API Gateway, Apigee) bills per request and scales operational effort to near-zero; a self-hosted gateway (Kong, Envoy-based) has flat infra cost regardless of volume but requires a team to operate it. At low-to-moderate request volume, managed is usually cheaper in total cost once engineer-hours are counted; at very high sustained volume, the per-request fee crosses over and self-hosted becomes cheaper - the crossover point is usually in the tens of millions of requests/month range, not something to guess without checking current vendor pricing.

## Comparison / Selection Matrix

| | Kong | AWS API Gateway | Envoy (as gateway) | Nginx |
| --- | --- | --- | --- | --- |
| Model | Self-hosted, plugin-based | Fully managed | Self-hosted, xDS config | Self-hosted, config-file |
| Extensibility | Lua/Go plugins, large ecosystem | Lambda authorizers, mapping templates | gRPC/HTTP filter chain, most flexible | Lua via OpenResty, config-driven |
| Best for | Teams wanting managed-plugin ergonomics without vendor lock-in | Teams already on AWS wanting zero ops | Platform teams standardizing gateway + service mesh on one proxy | Simple routing/TLS termination, high raw throughput |
| Ops burden | Medium (self-hosted, but plugin config not code) | Near-zero | High (steep learning curve, powerful) | Low-medium |
| Pick it when... | You need rich out-of-box auth/rate-limit plugins without hand-rolling | You're AWS-native and want to avoid running infrastructure | You already run Envoy as a service mesh sidecar and want one technology for both layers | You need a fast, simple edge proxy and don't need a plugin ecosystem |

## Security & Hardening

The gateway is the system's most attractive attack surface - every external request touches it, and a compromise here potentially exposes every service behind it, not just one.

- **TLS termination** happens here (see [Load Balancer § SSL/TLS Handling](./load-balancer.md#ssltls-handling) for the general mechanics) - the gateway holds the certificate, decides whether to re-encrypt to backends, and is where certificate rotation must be zero-downtime.
- **Input validation at the edge** - schema-validate request bodies against the expected contract before forwarding, rejecting malformed payloads before they reach a service. This is defense-in-depth, not a replacement for service-side validation - a service reachable by any other path (internal call, gateway bypass) still needs its own validation.
- **The trust-boundary requirement:** header-injected identity (`X-User-Id`) is only safe if backend services are *unreachable* except through the gateway - enforced via network policy, security groups, or mTLS between gateway and services (see [Load Balancer § Mutual TLS](./load-balancer.md#mutual-tls-mtls)). A service that also accepts direct traffic and blindly trusts `X-User-Id` from any caller has no real authentication - it has a header anyone can forge.
- **WAF (Web Application Firewall) integration** - many gateways sit behind or embed a WAF layer for SQL injection, XSS payload, and known-signature attack filtering before requests reach the routing pipeline.

> ⚠️ **Warning / Gotcha**
> A gateway that terminates TLS and forwards plaintext to backends is safe only inside a genuinely trusted network boundary. In a zero-trust or multi-tenant cluster, plaintext gateway-to-backend traffic is interceptable by anything else on that network segment - re-encrypt (mTLS) if that assumption doesn't hold.

## Performance & Optimization

The gateway sits on every request's critical path, so its own latency budget matters as much as what it protects.

- **Connection pooling to backends** - identical concern to a load balancer's (see [Load Balancer § Connection Pooling](./load-balancer.md#connection-pooling--keep-alive-management)); opening a fresh connection per request compounds badly when the gateway is also fanning out to multiple services for composition.
- **Caching at the gateway** - GET responses for rarely-changing resources can be cached at the edge with a short TTL, saving a full backend round trip. This is a distinct, coarser-grained cache from application-level caching (see [Caching](./caching.md)) - gateway caching operates on whole HTTP responses keyed by URL/headers, not on application objects.
- **Timeout budgets for composition** - when the gateway fans out to N services, it must set a per-call timeout tight enough that one slow service doesn't stall the aggregate response. A common pattern: an overall response deadline (e.g. 500ms) with per-call timeouts subordinate to it, and a policy for what happens to calls still in flight when the deadline hits (see [API Composition](#api-composition--backend-for-frontend-bff) above for the partial-response decision).
- **Where the added hop costs the most:** synchronous composition fan-out. A single-service pass-through route adds roughly one extra network hop of latency (sub-millisecond to a few ms depending on deployment topology); a 4-way fan-out composition is bounded by its *slowest* call, not the sum - but a naive sequential implementation (call service A, then B, then C) turns that into the sum, which is the most common gateway performance bug.

## Resilience & Failure Handling

The gateway concentrates traffic, which means it also concentrates blast radius - a gateway outage takes down access to every service behind it simultaneously, even if every one of those services is healthy.

- **High availability is non-negotiable** - deploy the gateway itself in an HA pair or auto-scaled fleet behind its own load balancer, exactly as described in [Load Balancer § High Availability & Resilience](./load-balancer.md#high-availability--resilience). A gateway with no HA story has just moved the single-point-of-failure problem from "one backend" to "the entire system's front door."
- **Circuit breaking per backend** - if `order-service` starts timing out, the gateway should stop sending it traffic (open the circuit) rather than let every client request pile up waiting on a service known to be failing, and fail fast with an explicit error instead.
- **Fallback / degraded responses in composition** - per [API Composition](#api-composition--backend-for-frontend-bff), a slow or failed sub-call in a fan-out should not fail the entire aggregate response by default; return partial data with the failed section explicitly marked absent, and let the client decide how to render that.
- **Bulkheading** - isolate connection pools and thread/worker budgets per backend so one saturated downstream service can't exhaust the gateway's capacity for calls to every other service.

This feeds into the consolidated [Production Failure Modes & Gotchas](#production-failure-modes--gotchas) below.

## Deployment Contexts

- **Edge / ingress gateway** - the classic placement: internet-facing, in front of all services, typically paired with a CDN and WAF ahead of it.
- **Kubernetes Ingress / Gateway API** - in a Kubernetes cluster, the gateway role is often filled by an Ingress controller (nginx-ingress, Envoy Gateway) implementing the same routing/TLS/auth concerns as a cluster-native resource rather than a standalone product.
- **Internal gateway** - some organizations run a second, internal-only gateway between service tiers (e.g. a platform team's shared internal API surface) - same mechanics, different trust boundary and typically lighter-weight policy than the internet-facing one.

## Observability & Debugging

The gateway is the natural place to establish request tracing, since it's the first system component every external request touches.

- **Correlation ID injection** - if an incoming request has no trace header, the gateway generates one (`X-Request-Id`, W3C `traceparent`) and attaches it before forwarding, exactly as described for load balancers in [Load Balancer § Trace Context Propagation](./load-balancer.md#trace-context-propagation). Every downstream service log line and every fan-out call in a composition should carry this ID so a single client request can be reconstructed across services after the fact.
- **Per-route and per-backend metrics** - request count, latency percentiles, and error rate broken down by route (not just in aggregate) surface which specific backend is degrading before it shows up as a system-wide symptom.
- **Composition-specific tracing** - for fan-out requests, the trace must show all N parallel sub-calls under one parent span, including which ones timed out or returned partial data; a flat trace with no parent-child structure makes diagnosing "why was this composed response slow" nearly impossible.

## Production Failure Modes & Gotchas

> **Interviewer TL;DR:** Gateway failures cluster into three buckets: the gateway itself becomes the bottleneck it was meant to prevent, security boundaries erode because a downstream service trusts something it shouldn't, or composition logic quietly turns the gateway into a distributed monolith.

| Failure mode | Root cause | Signal |
| --- | --- | --- |
| Gateway as single point of failure | No HA deployment for the gateway itself | Full outage despite all backend services healthy |
| Gateway bypass | Service reachable directly, not only via gateway | Requests missing gateway-injected headers/trace IDs arriving at a service |
| Cascading timeout in composition | Sequential fan-out calls, no per-call timeout budget | Aggregate endpoint latency = sum of sub-call latencies, not max |
| Gateway becomes a distributed monolith | Business logic accumulates in transformation/routing config | Every service's business rule change requires a gateway config deploy |
| Header-injected identity spoofing | Backend trusts `X-User-Id` without verifying it can only arrive via the gateway | Unauthenticated requests reaching services with elevated access |
| Hot-path config reload outage | Routing table reload drops in-flight connections or briefly 502s all traffic | Error spike correlated exactly with a config deploy timestamp |

### Gateway as a Single Point of Failure

_The gateway centralizes convenience; it also centralizes risk if deployed as one instance._

Every one of the backend services can be perfectly healthy and the system is still fully down if the single gateway instance crashes or its host fails. This is the direct trade-off for centralizing cross-cutting concerns - you've concentrated risk exactly where you concentrated value.

**Mitigation:** deploy the gateway in the same HA pattern as any critical-path load balancer - active-active behind its own LB, health-checked, auto-scaled. Treat gateway uptime as the tightest SLA in the system, because it's now a hard ceiling on every other service's effective availability.

### Gateway Bypass - Trusting Forwarded Identity Without Enforcement

_A gateway that injects `X-User-Id` is a convenience, not a security control, unless the network makes the gateway mandatory._

If a service is reachable on a network path that doesn't route through the gateway - a misconfigured Kubernetes `Service`, a firewall rule left open, a legacy internal endpoint - anything on that path can set `X-User-Id: any-user-they-want` and the service will trust it, because the service was never designed to see requests that didn't already pass gateway auth.

**Mitigation:** network-level enforcement so services genuinely cannot be reached except via the gateway (security groups, network policy, mTLS between gateway and backends per [Load Balancer § Mutual TLS](./load-balancer.md#mutual-tls-mtls)). Detection: compare request volume arriving at a service against request volume the gateway recorded routing to it - a gap means traffic is arriving by another path.

### Cascading Timeout in Composition

_Fan-out composition is only as fast as its slowest call - but only if it's actually parallel._

The most common gateway performance bug: a composition endpoint calling four backend services *sequentially* instead of in parallel. Each call has its own reasonable timeout (say 200ms), but four sequential 200ms budgets compound into an 800ms worst case for a single client request, and a naive implementation often has no overall deadline at all - so one degraded service silently drags the whole endpoint down with it.

**Mitigation:** issue fan-out calls concurrently, enforce one overall response deadline distinct from and stricter than the sum of per-call timeouts, and decide up front (per [API Composition](#api-composition--backend-for-frontend-bff)) whether a timed-out sub-call fails the whole response or is dropped from a partial one.

### Gateway Becomes a Distributed Monolith

_The line between "cross-cutting policy" and "business logic" is where gateway scope creep hides._

A gateway that starts with mechanical routing and header injection can, over months, accumulate conditional payload transformation rules, per-tenant business exceptions, and feature-flag-driven routing logic - until a change to `order-service`'s field names requires editing a shared gateway config that every other team's routes also depend on. This reintroduces the tight coupling microservices were meant to remove, just relocated to one YAML file instead of one codebase.

**Mitigation:** keep transformation mechanical (rename, protocol-translate, strip/inject headers); the moment a rule encodes "if this business condition, do X," move it into the owning service or a dedicated BFF for that client type, not the shared edge gateway.

### Common Misconceptions

**"An API gateway is just a load balancer with extra features."** No - a load balancer's unit of work is "route this connection to a healthy replica of one service"; a gateway's unit of work is "apply an entire policy pipeline (auth, rate limiting, transformation, possibly aggregation) and then route to potentially many different services." Feature overlap at the routing layer doesn't make them interchangeable in what they're responsible for.

**"Centralizing cross-cutting concerns at the gateway removes the need for services to enforce them."** No - the gateway's checks are a first line of defense predicated on the network actually preventing bypass. A service reachable by any other path must still validate its own inputs and never blindly trust gateway-injected headers as an unconditional security guarantee.

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** You're asked to design the entry point for a system with 15 microservices and both a mobile app and a public partner API. Where do you start?
> **Ideal answer:** Start with what's shared vs divergent across client types - if mobile and the partner API need meaningfully different payload shapes, propose a shared outer gateway for auth/TLS/rate-limiting plus a BFF per client type for aggregation and shaping. If needs are similar, one gateway config suffices. Either way, the gateway's job is routing and cross-cutting policy, not business logic.
> **Common trap:** Jumping straight to "add an API gateway" without first asking whether client needs actually diverge enough to justify BFFs - a single overloaded gateway config trying to serve very different clients is how gateways turn into distributed monoliths.
> **Next question:** "The partner API needs stricter rate limits and mTLS that the mobile app doesn't need - where does that live?" → Per-route policy at the gateway (route-scoped rate limit config, route-scoped backend TLS mode) rather than a second gateway - most gateways support per-route policy overrides for exactly this.

> 🎯 **Interview Lens**
> **Q:** A composed endpoint that fans out to 4 services has a P99 latency of 1.2 seconds, but each individual service has a P99 of under 150ms. What's your first hypothesis?
> **Ideal answer:** The fan-out is very likely sequential, not parallel - four ~150ms-P99 calls run one after another land close to 600ms+ even before compounding tail latency, and if there's no overall deadline shorter than the sum, one slow call at the tail drags the whole response down further. Check whether the calls are issued concurrently and whether a bounded overall timeout exists independent of the per-call timeouts.
> **Common trap:** Assuming the bottleneck must be in one specific backend service and trying to optimize that service first, without first confirming the fan-out pattern itself isn't the problem.
> **Next question:** "One of the four services is occasionally slow due to a downstream DB issue - how do you keep it from tanking every composed response?" → Circuit-break that specific backend and define a partial-response fallback (omit that field, mark it degraded) rather than letting the aggregate wait on a call known to be unreliable.

> 🎯 **Interview Lens**
> **Q:** How does the gateway know a request is authenticated, and why should downstream services trust that?
> **Ideal answer:** The gateway validates the credential (JWT signature check or session lookup - see [Authentication](./authentication.md) for the mechanism trade-off) and injects the resolved identity into internal headers for backend services to read. Downstream services trust those headers only because the network guarantees they're unreachable except through the gateway - it's a network-enforced boundary, not a cryptographic one at the service layer.
> **Common trap:** Describing header-injected identity as inherently secure without naming the network-enforcement precondition - a service reachable by any other path can have its trust in `X-User-Id` trivially forged.
> **Next question:** "How would you detect if that trust boundary had actually been broken in production?" → Compare request counts arriving at a service directly against counts the gateway recorded routing to it; a persistent gap indicates traffic reaching the service by an unenforced path.

> 🎯 **Interview Lens**
> **Q:** Your team wants to add a "if tenant is on the legacy plan, transform this field differently" rule to the gateway config. Do you approve it?
> **Ideal answer:** Push back - that's a business rule, not a mechanical transformation, and it's exactly the pattern that turns a gateway into a distributed monolith: one shared config file now encodes per-tenant business logic that every other team's routes also depend on for changes and review. Move the conditional logic into the owning service, or a dedicated BFF layer if it's genuinely about client-type differences rather than tenant-specific business rules.
> **Common trap:** Approving it because "the gateway can already do transformation" without distinguishing mechanical reshaping (safe) from embedded business conditionals (scope creep).

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| BFF | Backend-for-Frontend | A thin aggregation layer tuned to one client type's needs, usually behind a shared outer gateway |
| WAF | Web Application Firewall | Edge layer filtering known attack signatures (SQLi, XSS) before requests reach routing |
| TLS | Transport Layer Security | Encrypts and authenticates traffic between two parties |
| mTLS | Mutual TLS | Both sides present certificates; used to enforce gateway-to-backend trust |

### Anti-patterns

- **Business logic embedded in gateway transformation config** - conditional per-tenant or per-feature rules turn a shared routing layer into a distributed monolith where every business rule change requires a shared-config deploy. Keep transformation mechanical; move conditionals into the owning service.
- **No HA deployment for the gateway itself** - a single-instance gateway reintroduces the exact single-point-of-failure problem it was meant to eliminate for backends, just relocated to the front door. Deploy HA, exactly as any critical-path load balancer would be.
- **Sequential fan-out in composition** - calling N backend services one after another instead of concurrently turns a max(latency) problem into a sum(latency) problem. Issue fan-out calls in parallel with a bounded overall deadline.
- **Trusting header-injected identity without network enforcement** - `X-User-Id` set by the gateway is only meaningful if backend services are provably unreachable by any other path. Enforce with network policy or mTLS, not convention.
