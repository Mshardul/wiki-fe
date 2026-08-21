# Load Balancer

## Prerequisites

- **TCP/IP & OSI Model** [Must read] <!-- link: ./tcp-ip-osi-model.md -->
- **HTTP/1.1 vs HTTP/2** [Should read] <!-- link: ./http.md -->
- **[DNS](./dns.md)** [Should read]
- **Server Concurrency Models** [Should read] <!-- link: ./server-concurrency-models.md -->

---

## Table of Contents

- [Conceptual Foundations & Mental Models](#conceptual-foundations--mental-models)
- [Classification & Variants](#classification--variants)
- [Traffic Distribution Algorithms](#traffic-distribution-algorithms) (→ [full article](./load-balancer-algorithms.md))
- [Health Checks & Backend Management](#health-checks--backend-management)
- [Session Persistence](#session-persistence)
- [SSL/TLS Handling](#ssltls-handling) (→ [full article](./load-balancer-tls.md))
- [High Availability & Resilience](#high-availability--resilience) (→ [full article](./load-balancer-high-availability.md))
- [Quick Decision Guide](#quick-decision-guide)
- [Performance & Optimization](#performance--optimization)
- [Advanced Patterns](#advanced-patterns)
- [Observability & Debugging](#observability--debugging)
- [Production Failure Modes](#production-failure-modes)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

A load balancer sits between clients and a pool of servers, distributing incoming requests to prevent any single server from becoming a bottleneck. At L4, it routes based on IP and TCP/UDP headers without inspecting application data; at L7, it can make routing decisions based on HTTP headers, URLs, and cookies. The core trade-off is between simplicity and control: L4 is faster with lower overhead, L7 is more powerful but adds <abbr>latency</abbr> and complexity. In production, load balancers are almost always deployed in HA pairs with floating IPs to eliminate themselves as a single point of failure.

---

## Conceptual Foundations & Mental Models

**Interviewer TL;DR:** The L4 vs L7 decision is the first thing to establish - everything else (routing, SSL, stickiness) follows from it.

**Mental model:** A load balancer is a traffic cop standing between the internet and your servers - it sees every incoming request and decides which server handles it, invisibly to the client.

### Core Problem: Single Server as Bottleneck

Any single server has hard limits: CPU cores, memory, open file descriptors, and network bandwidth. Beyond those limits, requests queue up, latency spikes, and eventually the server crashes. A load balancer solves this by spreading requests across many servers, making the system appear as one endpoint to clients while horizontally scaling behind the scenes.

The problem isn't just capacity - it's also availability. If your single server crashes, everything goes down. A load balancer with multiple backends means one server failure doesn't equal an outage.

### Abstraction: Transparent Traffic Distributor

From a client's perspective, they connect to one IP and get a response. They have no visibility into which backend served them. The load balancer handles:

1. Accepting the client connection
2. Selecting a backend
3. Forwarding the request (and response)
4. Managing the lifecycle of both connections

This transparency is what makes <abbr>horizontal scaling</abbr> seamless - you can add or remove backends without clients noticing.

### L4 vs L7 - Where in the Stack Interception Happens

This is the most important classification decision.

**L4 (Transport Layer):** The LB sees TCP/UDP packets. It knows source IP, destination IP, and ports - nothing more. It cannot inspect HTTP headers, cookies, or URLs. Critically, it does **not** terminate the TCP connection - it forwards packets directly, so the client and backend share one end-to-end TCP connection. Routing is fast because no application-layer parsing is needed.

**L7 (Application Layer):** The LB **terminates** the client's TCP connection entirely. It then parses the HTTP request, makes a routing decision based on headers/URL/cookies, and opens a brand-new TCP connection to the chosen backend. Two separate TCP connections exist: client → LB, and LB → backend. The client never communicates directly with the backend. This adds latency (two TCP handshakes) but enables powerful routing: send `/api/*` to one pool, `/static/*` to another, route based on `User-Agent`, implement sticky sessions via cookies, etc.

```
L4 Flow:  Client ──TCP──▶ LB ──TCP──▶ Backend  (packet forwarding, no parsing)
L7 Flow:  Client ──TCP──▶ LB (parses HTTP) ──TCP──▶ Backend  (two connections)
```

> 🧠 **Thought Process**
> When an interviewer asks "how would you design a load balancer for this system?", the first question to ask yourself: _do I need to make routing decisions based on request content?_ If yes → L7. If you just need to distribute TCP connections cheaply → L4. Most modern web systems need L7 for SSL termination and URL-based routing alone.

**Key Takeaway:** The L4 vs L7 decision is the foundation - it determines what the LB can route on, whether it can terminate SSL, and whether sticky sessions are possible. Everything else follows from it.

---

## Classification & Variants

**Interviewer TL;DR:** Default to cloud-native; use software LBs when you need control; hardware only for legacy or extreme <abbr>throughput</abbr> requirements.

**Mental model:** Load balancers come in different shapes depending on _where_ they live in the network and _what_ they run on. Knowing the taxonomy prevents you from proposing a software LB for a job that needs hardware-level throughput, or a cloud-native LB for a use case requiring custom protocol support.

### Layer 4 vs Layer 7 Load Balancers

Covered in depth in [L4 vs L7](#l4-vs-l7--where-in-the-stack-interception-happens). Key production implications:

| Dimension           | L4                             | L7                          |
| ------------------- | ------------------------------ | --------------------------- |
| Throughput          | Very high (line-rate possible) | Lower (parsing overhead)    |
| Routing granularity | IP + Port only                 | URL, headers, cookies, body |
| SSL handling        | Passthrough only               | Termination + re-encryption |
| Observability       | Connection-level metrics       | Request-level metrics       |
| Examples            | AWS NLB, HAProxy TCP mode      | AWS ALB, nginx, Envoy       |

### Hardware vs Software vs Cloud-native

**Hardware LBs** (F5, Citrix ADC): Purpose-built ASICs for line-rate throughput. Used in enterprises for legacy systems. Expensive, inflexible, hard to automate. Largely being replaced by software alternatives.

**Software LBs** (HAProxy, nginx, Envoy): Run on commodity hardware or VMs. Highly configurable, scriptable, and cloud-friendly. HAProxy is the production benchmark for raw performance among software LBs.

**Cloud-native** (AWS ALB/NLB, GCP Cloud Load Balancing): Fully managed, auto-scaling, integrated with cloud IAM and monitoring. No infrastructure to manage, but limited configuration flexibility and potential vendor lock-in.

> ⚖️ **Decision Framework**
>
> - **Hardware:** Only if you have legacy regulatory requirements or need wire-speed L4 forwarding at 100Gbps+.
> - **Software:** When you need full control, custom protocols, or on-prem deployment.
> - **Cloud-native:** Default for any cloud-hosted workload. Operational savings almost always outweigh flexibility loss.
> - **When NOT to use cloud-native:** Cross-cloud or hybrid routing requirements, or when pricing becomes prohibitive at extreme scale.

### Edge/Internet-facing vs Internal/Private Load Balancers

**Internet-facing:** Exposed to the public internet. Handles DDoS mitigation, SSL termination, and rate limiting as first-line concerns. Has a public IP and is the entry point to your system.

**Internal/Private:** Routes traffic between microservices inside a VPC or data center. Handles service mesh traffic, gRPC, or internal API routing. Not externally exposed - different security profile (though zero-trust architectures challenge the "trust inside the network" assumption).

In a mature architecture, both exist in layers:

```
Internet → [Edge LB / CDN] → [Internet-facing L7 LB] → [Internal L4/L7 LBs] → Services
```

### Reverse Proxy vs Dedicated LB

A reverse proxy (nginx, Envoy) sits in front of backends and forwards requests - functionally identical to an L7 LB. The distinction is conceptual: a reverse proxy is often also responsible for caching, compression, and serving static content, while a "load balancer" implies traffic distribution as its primary role.

In practice, the line is blurred. nginx is both a reverse proxy and an LB. Envoy is a proxy that does LB. AWS ALB is a managed LB that also performs proxy functions. Don't get hung up on the label.

**Key Takeaway:** Default to cloud-native for managed simplicity; use software LBs when you need configuration control; hardware only for legacy constraints or extreme throughput. The reverse proxy vs LB distinction is mostly semantic - in practice they're the same component.

---

## Traffic Distribution Algorithms

**Interviewer TL;DR:** Round Robin for uniform workloads; Least Connections for variable ones; <abbr>Consistent Hashing</abbr> when backend affinity and pool stability both matter.

The algorithm answers one question: _given N healthy backends, which one gets this request?_ Round Robin and Least Connections cover uniform vs variable request cost; Deterministic IP Hashing and Consistent Hashing add backend affinity, with Consistent Hashing solving the reshuffle problem plain modulo hashing has when the pool resizes.

🔗 Deep-Dive: [Load Balancer Traffic Distribution Algorithms](./load-balancer-algorithms.md) - Round Robin, Least Connections, IP Hashing, Consistent Hashing, Least Response Time, Resource-Based routing, and the full algorithm cheat sheet.

---

## Health Checks & Backend Management

**Interviewer TL;DR:** Active checks detect failures fast; always pair them with connection drain and slow-start to prevent cascading failures during backend changes.

**Mental model:** The LB needs to know which backends are alive _and capable of handling traffic_. Health checks are the mechanism - the difference between "the server is up" and "the server is up and can serve requests."

### Active vs Passive Health Checks

**Active (proactive):** The LB periodically sends synthetic requests to each backend (TCP ping, HTTP GET to `/health`) and marks it healthy or unhealthy based on the response.

```
LB → GET /health HTTP/1.1 → Backend
     ← 200 OK             (healthy)
     ← 503 / timeout      (unhealthy → remove from pool)
```

**Passive (reactive):** The LB observes real traffic responses. If a backend returns 5xx errors or times out above a threshold, it's marked unhealthy. No synthetic traffic, but slower detection - a backend must fail real requests before removal.

Most production setups use both: active checks for fast detection, passive checks as a secondary signal.

### Check Interval, Failure Threshold & Timeout Tuning

Key parameters:

- **Interval:** How often to probe (e.g., every 5s). Shorter = faster detection, higher overhead.
- **Failure threshold:** Consecutive failures before marking unhealthy (e.g., 3). Prevents flapping on transient errors.
- **Success threshold:** Consecutive successes before marking healthy again (e.g., 2). Prevents premature return.
- **Timeout:** How long to wait for a response. Must be shorter than the interval.

```
option httpchk GET /health
timeout check 2s
default-server inter 5s fall 3 rise 2
```

### Graceful Connection Drain vs Abrupt Removal

When a backend needs to be removed (deploy, scale-down), abruptly cutting connections breaks in-flight requests. Graceful drain:

1. LB stops sending _new_ requests to the backend.
2. Existing connections are allowed to complete (up to a drain timeout, e.g., 30s).
3. After timeout, remaining connections are forcibly closed.

Critical for long-lived connections (WebSockets, gRPC streams, file uploads) - [Long-Lived Connection Drain Timeouts](#long-lived-connection-drain-timeouts-websockets-sse) covers the failure mode when drain timeouts are misconfigured.

### Slow-Start / Warmup After Backend Recovery

After a backend returns to the healthy pool, send it a fraction of its normal traffic weight, ramping up over a configured period (e.g., 60 seconds to full weight).

Prevents cold-start JVM GC pauses, unwarmed caches, and connection pool initialization from causing a backend to fall behind immediately after recovery and trigger another removal cycle.

### Health Check Depth: Shallow vs Deep

Not all health checks are equal. The depth of what a check verifies has a direct trade-off between accuracy and safety.

**Shallow check:** The endpoint returns 200 immediately, confirming the process is alive and the port is open. Fast, zero risk of false positives, but blind to dependency failures (DB is down, cache is unreachable).

```
GET /health → 200 OK   (process is alive, nothing else verified)
```

**Deep check:** The endpoint queries downstream dependencies - DB connection pool, cache, external services - before returning healthy. Catches real dependency failures but introduces a dangerous failure mode.

**The cascading failure trap with deep checks:** If your DB goes slow (not down), every backend's deep health check times out simultaneously. The LB removes all backends from the pool at once. Now you have a healthy application, a slow-but-functional DB, and a completely dead fleet - caused entirely by the health check. This is worse than serving degraded traffic.

**The right model:**

- **Liveness** (`/healthz`): Is the process running? Shallow. Used to decide if the process should be restarted.
- **Readiness** (`/readyz`): Is the process ready to serve traffic? Checks local state (connection pools initialized, caches warmed). Does **not** query external dependencies.
- **Dependency health**: Monitor separately via metrics/alerting - do not couple it to the LB health check.

**Key Takeaway:** Active probes + readiness semantics + graceful drain + slow-start - omit any one and you will cause cascading failures or <abbr>thundering herds</abbr> on every deploy. Deep health checks that query dependencies are more dangerous than shallow ones.

---

## Session Persistence

**Interviewer TL;DR:** Sticky sessions are a crutch - they mask a stateful backend problem; the real fix is externalizing session state so any backend can serve any client.

**Mental model:** Sometimes the same client _must_ go to the same backend - because session state lives there or the cache is warm there. Session persistence ("sticky sessions") is the mechanism, but it comes with real costs that often point to an underlying architectural problem.

**Why this exists:** HTTP is stateless by design - each request is independent, and the server has no built-in memory of who you are between requests. Traditional web applications work around this by storing session data locally on the server: when you log in, a session object is created in backend-2's memory (or on its disk). Your session token (a cookie) maps to that object. This works fine with one server. With a load balancer distributing requests across many servers, your next request might land on backend-3, which has no record of your session - you get a 401 or an empty cart.

Sticky sessions are the LB-level band-aid: "always send this client back to the same backend." This works until that backend is redeployed, crashes, or gets overloaded. The underlying problem - session state coupled to a single server - remains.

**The interview-critical distinction:** "Sticky" is a routing property (enforced by the LB). "Stateful" is an application property (data lives on one server). Interviewers probe whether you understand that the right fix is making backends stateless by externalizing session state to a shared store (Redis, Memcached), not making routing stickier.

**The exception - protocol-level stickiness:** WebSocket and SSE connections are inherently stateful at the _protocol_ level - the connection itself is the session. Stickiness here is not a crutch; it is architecturally required. You cannot serve a WebSocket frame on backend-2 when the connection was opened on backend-1. This is fundamentally different from HTTP session stickiness: the problem isn't where state is stored, it's that the connection itself must persist to one backend. See section 11.3 for the drain implications.

### Cookie-Based Persistence

The LB inserts a cookie (e.g., `SERVERID=backend-2`) in the first response. On subsequent requests, the LB reads this cookie and routes to the same backend.

**Advantage:** Works correctly even when clients change IPs (mobile networks, NATs). More reliable than IP-based stickiness.

**Disadvantage:** Requires L7 (the LB must inspect HTTP headers). The LB must manage cookie state or embed the backend ID directly in the cookie value.

### IP-Hash-Based Persistence

Covered in [Deterministic IP Hashing](./load-balancer-algorithms.md#deterministic-ip-hashing). Routes based on source IP hash. Simpler but breaks behind NATs and when clients change IPs.

### Risks: Uneven Load Distribution & Failure Stickiness

**Uneven distribution:** If one backend is assigned 30% of clients but those clients happen to be high-traffic users, that backend gets disproportionate load.

**Failure stickiness:** When the sticky backend fails, those clients' sessions break. If session state was stored locally on the failed backend, it's lost. This is why sticky sessions are a **crutch** - they paper over a stateless architecture problem. The real fix is externalizing session state to Redis or Memcached so any backend can serve any client.

> ⚖️ **Decision Framework**
> Use sticky sessions only as a short-term migration aid or for specific workloads (WebSocket connections, stateful gaming sessions). For REST APIs and stateless services, sticky sessions add complexity with no benefit. If you find yourself needing them for web sessions, the right fix is externalizing session state to a shared store.

### Client IP Preservation (X-Forwarded-For, Proxy Protocol)

When the LB terminates the client connection and opens a new one to the backend, the backend sees the LB's IP as the source - not the client's. This breaks IP-based rate limiting, geo-routing, audit logging, and security rules.

**X-Forwarded-For (XFF):** The LB adds `X-Forwarded-For: <client-ip>` to the HTTP request. Each hop appends to the list: `X-Forwarded-For: <client-ip>, <proxy-1-ip>, <proxy-2-ip>`. The trust model is precise: if you have **N trusted proxy hops** between the internet and your application, the real client IP is the **Nth value from the right**. Values to the left of that position are client-supplied and must never be trusted. At your outermost LB, strip any incoming XFF header entirely before appending the real client IP - this prevents clients from pre-injecting fake IPs into the chain.

**Proxy Protocol (v1/v2):** A lightweight header prepended to the TCP stream before any application data. Works for any TCP-based protocol, not just HTTP. Harder to spoof, better for L4 use cases. Backend must explicitly support it.

```
PROXY TCP4 192.168.1.1 10.0.0.1 56324 443\r\n
```

**Key Takeaway:** Sticky sessions are a band-aid for stateful backends - the correct fix is externalizing session state. The exception is WebSocket and SSE, where stickiness is a protocol requirement, not an architectural choice.

---

## SSL/TLS Handling

**Interviewer TL;DR:** Terminate at the LB for simplicity; re-encrypt if compliance demands E2E encryption - but you're paying two TLS handshakes per request.

TLS is computationally expensive, and the LB sits at the exact point where you decide who pays that cost: terminate at the LB (simple, backends stay dumb, but LB→backend is plaintext), passthrough (full E2E encryption but L4-only, no L7 routing), or re-encrypt (both L7 routing and E2E encryption, at the cost of two handshakes per request).

🔗 Deep-Dive: [Load Balancer TLS Handling](./load-balancer-tls.md) - Termination, passthrough, re-encryption, certificate management/rotation, and mTLS at the LB.

---

## High Availability & Resilience

**Interviewer TL;DR:** An LB without HA is itself a SPOF - always deploy in an HA pair with a floating VIP; active-active is preferred but requires stateless LBs.

The LB eliminates backends as a SPOF, but the LB itself becomes one unless deployed with its own HA strategy - a floating VIP shared between nodes, with VRRP (or a cloud equivalent) transferring ownership on failure detection. Active-Passive is simple with a failover gap; Active-Active needs stateless LBs or synchronized state.

🔗 Deep-Dive: [Load Balancer High Availability](./load-balancer-high-availability.md) - Active-Active vs Active-Passive, floating IPs & VRRP, split-brain prevention, and cascading failure under backend loss.

---

## Quick Decision Guide

### Which LB Type?

```
Need HTTP-aware routing (URL, headers, cookies, gRPC)?
  ├─ YES ──▶ Use L7 LB (nginx, AWS ALB, Envoy)
  │            │
  │            ▼
  │          SSL strategy?
  │            ├─ Compliance requires E2E encryption ──▶ Re-encryption mode (→ ./load-balancer-tls.md#re-encryption-lb-to-backend-tls)
  │            ├─ Standard web traffic ──▶ Terminate at LB (→ ./load-balancer-tls.md#termination-at-lb-offload)
  │            └─ Cannot decrypt (mTLS passthrough) ──▶ SSL Passthrough (→ ./load-balancer-tls.md#ssl-passthrough)
  │
  └─ NO ──▶ Use L4 LB (AWS NLB, HAProxy TCP mode)
               │
               ▼
             Is the protocol gRPC or HTTP/2?
               └─ YES ──▶ ⚠ Switch to L7 - L4 cannot balance individual streams
```

### Which Algorithm?

```
Are request costs uniform AND backends homogeneous?
  ├─ YES ──▶ Round Robin (add weights if capacity differs)
  │
  └─ NO (variable cost or heterogeneous backends)
               │
               ▼
             Need backend affinity (warm cache, local state)?
               ├─ NO ──▶ Least Connections (or Least Response Time)
               │
               └─ YES
                    │
                    ▼
                  Clients behind NAT or frequently changing IPs?
                    ├─ YES ──▶ Cookie-based stickiness (→ #cookie-based-persistence)
                    │
                    └─ NO
                         │
                         ▼
                       Backend pool stable (rare adds/removes)?
                         ├─ YES ──▶ Consistent Hashing (→ ./load-balancer-algorithms.md#consistent-hashing)
                         └─ NO  ──▶ Cookie-based stickiness (→ #cookie-based-persistence)
```

### HA Strategy?

```
Traffic criticality?
  ├─ High (any downtime is unacceptable)
  │    └──▶ Active-Active pair + Anycast or DNS LB (→ ./load-balancer-high-availability.md#active-active-vs-active-passive-lb-pairs)
  │
  └─ Moderate (seconds of failover acceptable)
       └──▶ Active-Passive pair + VRRP Floating VIP (→ ./load-balancer-high-availability.md#floating-ips--vrrp)
                │
                ▼
              Need in-flight connections to survive failover?
                ├─ YES ──▶ Add conntrack state sync (conntrackd)
                └─ NO  ──▶ Stateless failover is sufficient; ensure clients retry
```

---

## Performance & Optimization

**Interviewer TL;DR:** Connection pooling and request buffering are table stakes; SNAT port exhaustion is the non-obvious production gotcha that trips up most candidates.

**Mental model:** At high scale, the LB itself becomes a bottleneck. These are the knobs that matter.

### Connection Pooling & Keep-Alive Management

**Problem:** Opening a new TCP connection to a backend for every request is expensive - the 3-way handshake plus TLS handshake adds multiple round trips of latency.

**Solution:** The LB maintains a pool of persistent connections to each backend. Incoming requests are multiplexed over these pooled connections. The number of backend connections becomes far smaller than the number of client requests.

Tuning: pool size per backend, idle timeout, max connection age.

### Request Buffering & Slow Client Protection

**Slow client problem:** A client uploading a large file at 1KB/s ties up a backend connection for the entire upload duration.

**Solution:** The LB buffers the full request body before forwarding to the backend. The backend connection is held only for the fast LB → backend transfer, not the slow client → LB transfer.

**Trade-off:** Increases LB memory usage. Must set max buffer size to prevent memory exhaustion from clients sending large payloads slowly - a potential DoS vector.

### Protocol Negotiation & Multiplexing (HTTP/2, gRPC)

An L7 LB negotiates HTTP/2 with clients via ALPN (Application-Layer Protocol Negotiation - a TLS extension that lets client and server agree on the application protocol, e.g., HTTP/2 vs HTTP/1.1, during the handshake itself) in the TLS handshake, while maintaining independent HTTP/1.1 or HTTP/2 connections to backends.

**gRPC specifically:** Each gRPC call is a separate HTTP/2 stream on a multiplexed connection. An L4 LB sees one long-lived TCP connection and routes it entirely to one backend - load balancing is effectively broken for gRPC. You need an L7 LB that understands HTTP/2 stream-level routing.

```
# Wrong: L4 LB with gRPC
Client ──TCP──▶ L4 LB ──TCP (one connection)──▶ Backend-1 (all calls land here)

# Right: L7 LB with gRPC
Client ──HTTP/2──▶ L7 LB ──per-stream routing──▶ Backend-1, Backend-2, Backend-3
```

### Bandwidth & Connection Limits Per Backend

Set per-backend limits to prevent one backend from being overwhelmed:

- Max concurrent connections
- Max request rate
- Max bandwidth

When a backend hits its limit, the LB queues or rejects new requests to that backend and routes elsewhere.

### SNAT Port Exhaustion & Connection Tracking Limits

**SNAT (Source NAT):** When an L4 LB forwards a packet to a backend, it rewrites the source IP to its own IP so the backend returns traffic through the LB. The LB uses a unique source port per connection to track which return packets belong to which client.

**Port exhaustion:** A single IP has 65,535 ports. With thousands of connections per second to a single backend, the LB can exhaust available source ports, causing new connections to fail silently.

**Connection tracking (conntrack):** The Linux kernel maintains a conntrack table - a record of every active network connection passing through the system - to enable stateful packet forwarding. This table has a max size. Hitting it causes packet drops - symptoms look like the LB and backends are healthy but new connections randomly fail.

**Retry storm amplification:** When new connections fail due to port exhaustion, clients retry - generating more connection attempts, exhausting ports faster, causing more failures, causing more retries. This positive feedback loop can accelerate a partial outage into a complete one within seconds. Clients with aggressive retry logic (no backoff, no jitter) are the biggest amplifiers. Ensure client retry policies use exponential backoff with jitter, and implement connection-level rate limiting at the LB to shed load before exhaustion is reached.

**Fixes:**

- DSR (Direct Server Return): backends respond directly to clients, bypassing the LB on the return path - eliminates SNAT entirely
- Multiple LB IPs (each has its own 65K port range)
- Tune `net.ipv4.ip_local_port_range` and `nf_conntrack_max`

### Backpressure & Load Shedding

**The problem:** All backends are at capacity simultaneously - connection pools full, CPU pegged. The LB has nowhere to route new requests. Without a deliberate strategy, it either queues indefinitely (memory exhaustion) or drops connections silently (worse than an explicit error).

**<abbr>Backpressure</abbr>:** Signal upstream that the system is at capacity, so the caller can slow down. At the LB level this means: stop accepting new connections from clients, or return explicit 503s, rather than queuing indefinitely.

**Load shedding:** Actively discard a portion of incoming traffic to protect the system from total collapse. The key insight: serving 70% of requests correctly is better than serving 100% of requests slowly and failing.

**Strategies at the LB layer:**

- **Queue with depth limit:** Accept requests into a queue up to a maximum depth. When the queue is full, return 503 immediately. Protects memory; gives clients a fast, actionable error.
- **Timeout-based shedding:** If a request has been queued longer than X ms without being dispatched, drop it. A client that has already timed out doesn't benefit from a late response.
- **Priority shedding:** Under load, drop lower-priority traffic first (e.g., health check polling, batch jobs) while preserving capacity for user-facing requests.

> ⚖️ **Decision Framework**
> The order of preference under overload: (1) reject early with 503 - fast, cheap, client can retry. (2) Queue briefly - only if the overload is transient (spike, not sustained). (3) Never queue indefinitely - this converts a traffic spike into a memory exhaustion crash.

> 🧠 **Thought Process**
> When an interviewer asks "what happens when your system gets 10x the expected traffic?", the answer they want is: the LB detects backend saturation, sheds excess load gracefully with 503s, and the system degrades proportionally rather than collapsing entirely. Cascading failure is what you're designing against.

### Rate Limiting at the LB Layer

The LB sits at the entry point of your system - making it the ideal enforcement point for rate limiting _before_ requests consume backend resources.

**What the LB can rate limit:**

- Per source IP: limits requests from a single client
- Per user/API key: requires L7 inspection of auth headers
- Per endpoint: `/search` gets stricter limits than `/profile`
- Global: total RPS cap across all clients combined

**Its role in the overall flow:**

```
Client → [LB: rate check] → Backend
              ↓
         429 Too Many Requests (rejected at edge, backend never touched)
```

Rate limiting at the LB is a first line of defence - it stops abuse and traffic spikes before they consume backend CPU, DB connections, or application memory.

**What it doesn't replace:** Fine-grained per-user business logic rate limiting (e.g., "10 API calls per user per minute with token bucket") is better handled in a dedicated rate limiter service or API gateway, which can share state across LB instances. The LB's rate limiting is coarse-grained and stateless-friendly.

🔗 Deep-Dive: [Rate Limiter](../components/rate-limiter.md) - Token bucket, leaky bucket, sliding window algorithms, distributed rate limiting, and Redis-based shared state.

**Key Takeaway:** SNAT port exhaustion and conntrack limits are the non-obvious production gotchas - backends and LB both appear healthy but new connections silently fail. Connection pooling and backpressure are table stakes; never queue indefinitely under overload.

---

## Advanced Patterns

**Interviewer TL;DR:** GSLB/Anycast solve multi-region routing; canary routing and traffic mirroring are how you deploy safely at scale without downtime.

**Mental model:** Beyond basic distribution, load balancers can be the control plane for sophisticated traffic management - gradual rollouts, observability injection, and multi-region routing.

### Global Server Load Balancing (GSLB) & Anycast

**GSLB:** Routes clients to the nearest or healthiest datacenter. Operates at the DNS level - responds with different IPs based on client geography and datacenter health. Failover is TTL-bound - but the reality is worse than the TTL suggests. OS resolvers, JVM's `InetAddress` (caches indefinitely by default unless `-Dnetworkaddress.cache.ttl` is set), browsers, and intermediate resolvers all cache DNS independently and may ignore your TTL entirely. In practice, after a GSLB failover, expect a long tail of clients (10–20 minutes or more) still hitting the old IP despite a 30-second TTL.

**Anycast:** Multiple datacenters advertise the same IP prefix via BGP (Border Gateway Protocol - the protocol internet routers use to exchange routing information and decide the best path to any destination IP). The routing infrastructure automatically directs clients to the "closest" datacenter by BGP path cost. Used by CDNs and DNS providers (Cloudflare, AWS Route 53) for global distribution. Failover is faster than DNS (BGP re-convergence, seconds) but requires BGP infrastructure.

> ⚖️ **Decision Framework**
> GSLB via DNS: simpler, works with any LB, but slow failover bounded by TTL. Anycast: fast failover, globally consistent, but requires BGP peering and more operational complexity. For most applications, DNS-based GSLB with low TTLs is sufficient.

### Canary Routing & Traffic Splitting

Route a percentage of traffic to a new version of a service while the rest goes to the stable version:

```
Stage 1:  100% → v1
Stage 2:    5% → v2,  95% → v1   (canary validation)
Stage 3:   50% → v2,  50% → v1   (progressive rollout)
Stage 4:  100% → v2              (complete cutover)
```

Implemented via weighted backend pools. The LB shifts weights based on operator input or automated signals (error rate below threshold → increase v2 weight automatically).

### Traffic Mirroring (Shadow Mode)

The LB duplicates live production traffic and sends a copy to a shadow backend. The shadow backend's responses are discarded - no client impact. Used to:

- Test a new backend version with real traffic without serving those responses
- Benchmark new infrastructure under real load
- Validate correctness of a rewritten service before cutover

### Service Mesh Integration (Sidecar Proxy vs Centralized LB)

**Service mesh (Istio, Linkerd):** Each service gets a sidecar proxy (Envoy) injected. All inter-service traffic flows through sidecar → sidecar. Load balancing, retries, circuit breaking, and mTLS happen at the sidecar level - no centralized LB needed for east-west traffic.

**Trade-off:**

- Sidecar mesh: more resilient (no central bottleneck), more complex to operate, higher per-pod resource overhead
- Centralized LB: simpler, single point of control, single point of failure (mitigated by HA)

For north-south traffic (internet → cluster), a centralized LB is still required. The mesh handles east-west.

### Blue-Green Deployment

Blue-green is architecturally distinct from canary. Where canary is a gradual ramp, blue-green is an **atomic, all-or-nothing cutover**.

**Mechanism:**

- Two identical production environments exist simultaneously: Blue (current live) and Green (new version).
- Green is deployed and fully tested in isolation while Blue serves 100% of production traffic.
- Cutover: the LB flips all traffic from Blue to Green in a single weight change (`Blue: 0%, Green: 100%`).
- If Green fails, rollback is instant - flip the weights back.

```
Before cutover:   100% → Blue (v1),   0% → Green (v2)
After cutover:      0% → Blue (v1), 100% → Green (v2)
Rollback:         100% → Blue (v1),   0% → Green (v2)  ← instant
```

**Vs Canary:**
| | Canary | Blue-Green |
|---|---|---|
| Rollout | Gradual (1% → 5% → 50% → 100%) | Atomic (0% → 100%) |
| Risk exposure | Partial - only canary users affected | All users at cutover moment |
| Rollback speed | Slow (ramp weights back down) | Instant (flip weights) |
| Infrastructure cost | Low (shared pool) | High (2x full environments) |
| Best for | Risky changes, need validation | DB schema migrations, config changes that can't be partial |

**When to prefer blue-green:** When the change cannot be partially deployed - for example, a database schema migration where v1 code and v2 code cannot coexist against the same schema.

**Key Takeaway:** Canary for gradual validation, blue-green for atomic cutover when partial deployment is unsafe. DNS-based GSLB is simpler than Anycast but DNS caching means failover is always slower than your TTL suggests.

---

## Observability & Debugging

**Interviewer TL;DR:** Track request counts per backend, not just connections - and treat LB access logs as the ground truth when routing behavior looks wrong.

**Mental model:** You can't debug what you can't measure. These are the signals that tell you your LB is healthy, stressed, or misconfigured.

### Key Metrics

| Metric                              | What It Tells You               | Alert Signal                                     |
| ----------------------------------- | ------------------------------- | ------------------------------------------------ |
| Active connections                  | Current load on LB and backends | Sudden spike → traffic surge or drain stuck      |
| Requests per second                 | Throughput                      | Deviation from baseline → upstream anomaly       |
| Error rate (4xx/5xx)                | Backend health                  | >1% 5xx → backend degradation                    |
| P95/P99 latency                     | Tail latency                    | >2x baseline → backend overload or queue buildup |
| Backend connection pool utilization | Pool exhaustion risk            | >80% → increase pool size                        |
| Health check failure rate           | Backend stability               | Any failures → investigate backend               |

### Backend Weight & Connection Distribution Imbalance

Symptom: one backend has 3x the connections of others despite equal weight.

Causes:

- Sticky sessions routing too many clients to one backend
- Least-connections algorithm working correctly (that backend handles fast requests, cycling connections quickly)
- Health check flapping causing others to briefly leave the pool
- Long-lived connections (WebSockets) skewing connection counts without proportional request load

Debugging: compare _request counts_ across backends, not just connection counts. A backend with many connections but low RPS is holding long-lived connections - not necessarily overloaded.

### Connection Drain Monitoring

During deploys, watch for:

- In-flight requests completing before drain timeout (healthy)
- Requests being dropped (drain timeout too short)
- Deploys stalling indefinitely (drain timeout too long, long-lived connections not closing)

Instrument: track "connections remaining after drain initiated" over time per backend.

### Trace Context Propagation

The LB sits at the boundary between the outside world and your services - making it the ideal place to inject or forward distributed trace context.

- **Inject if absent:** If an incoming request has no trace header, the LB should generate and attach one (e.g., `X-Request-ID`, W3C `traceparent`). This ensures every request has a correlation ID from the moment it enters the system.
- **Forward if present:** If the client already sends a `traceparent` header (from a browser SDK or upstream service), the LB must forward it unchanged - not overwrite it.
- **Standard formats:** Prefer W3C Trace Context (`traceparent: 00-<trace-id>-<span-id>-<flags>`) for interoperability. Avoid inventing custom header names that won't be understood by tracing backends (Jaeger, Zipkin, Datadog).
- **Why this matters for debugging:** Without trace context at the LB layer, you lose the ability to correlate an LB access log entry with a backend trace span - the two become unlinked islands of observability.

### Access Log Patterns for Debugging

LB access logs are the ground truth. Key fields:

- `upstream_response_time` vs `request_time` - large gap means slow client (upload) or queued connection
- `upstream_addr` - which backend served each request (detect routing skew)
- `upstream_status` - backend-side errors vs client-side 4xx
- `traceparent` / `x-request-id` - correlation ID to join LB logs with backend traces

**Key Takeaway:** Track request counts per backend, not just connections; inject trace context at the LB boundary so access logs and backend traces can be correlated; treat access logs as ground truth when routing behavior looks wrong.

---

## Production Failure Modes

**Interviewer TL;DR:** Two failure modes that cause real outages on this page's own topic - thundering herd on backend restart and drain timeouts on long-lived connections. Algorithm hot spots, SSL CPU saturation, and HA failover gaps are covered on their respective sibling pages.

**Mental model:** These are the scenarios that cause real outages. Know the cause, detection signal, and fix for each.

### Thundering Herd on Backend Restart

**Scenario:** All backends restart simultaneously (bad deploy). When they come back, the LB immediately sends full traffic. Backends are cold (empty caches, unwarmed JVM) and immediately get overwhelmed, causing health check failures, removal from pool, and another restart cycle.

**Detection:** Saw-tooth error rate and latency pattern correlated with deploy events.

**Fix:** [Slow-start](#slow-start--warmup-after-backend-recovery). Rolling deploys (restart one backend at a time). Deployment health gates (don't proceed to next instance until current one passes health checks).

> **⚠️ Common Traps & How to Recover**
>
> - **Trap:** Setting `rise 1` (one success before marking healthy) - backend gets full traffic before caches are warm. **Recovery:** Use `rise 2` or higher; add slow-start ramp.
> - **Trap:** Deploying all backends simultaneously because "it's faster." **Recovery:** Always enforce rolling deploys via deploy tooling, not discipline.
> - **Trap:** Health check passes (process is up) but service is still initializing. **Recovery:** Health endpoint must validate readiness (DB connection pool initialized, caches loaded), not just liveness.

### Long-Lived Connection Drain Timeouts (WebSockets, SSE)

**Scenario:** Deploy triggers connection drain. WebSocket connections don't close voluntarily. Drain timeout (30s) expires and the LB forcibly closes them. Clients receive unexpected disconnects mid-session.

**Detection:** Client-side WebSocket disconnect errors correlated with deploy timestamps.

**Fix:** Implement application-level graceful shutdown - send WebSocket close frames to clients before forcible drain. Increase drain timeout to accommodate typical session length. Use a reconnection protocol with session resumption on the client side.

> **⚠️ Common Traps & How to Recover**
>
> - **Trap:** Setting drain timeout to 30s for a system with WebSocket sessions that last 10+ minutes. **Recovery:** Measure actual P99 session duration; set drain timeout accordingly, or implement app-level close signals.
> - **Trap:** Treating all connection types the same in drain logic - HTTP and WebSocket need different handling. **Recovery:** Use protocol-aware drain: HTTP waits for in-flight request, WebSocket needs an explicit close frame.
> - **Trap:** Clients not implementing reconnection logic, assuming the connection is always stable. **Recovery:** Client-side exponential backoff + reconnect is non-negotiable for any long-lived connection system.

### Common Misconceptions

- **"Sticky sessions are always an anti-pattern"** - wrong for WebSocket/SSE, where the connection itself *is* the session; stickiness there is architecturally required, not a crutch.
- **"Low DNS TTL means fast failover"** - browsers, JVM `InetAddress` (caches indefinitely by default), OS resolvers, and intermediate caches all ignore TTL independently; expect a 10-20 minute long tail on old IPs regardless of a 30s TTL.
- **"Adding more backends fixes the performance problem"** - not if the LB itself is the bottleneck (SNAT exhaustion, conntrack limits, SSL CPU - see [Load Balancer TLS Handling](./load-balancer-tls.md)). Profile the LB before scaling backends.

**Key Takeaway:** Each failure mode has a distinct detection signal - thundering herd (saw-tooth errors at deploy), drain gaps (WebSocket disconnects at deploy). Knowing the signal is half the fix. Algorithm hot spots, SSL CPU saturation, and HA failover gaps have their own detection signals on their respective sibling pages.

---

## Interview Scenario Bank

### L4 vs L7 Trade-off

> 🎯 **Interview Lens**
> **Q:** When would you choose L4 over L7?
> **Ideal answer:** L4 for raw throughput and low latency (gaming servers, financial tick data, large file transfers), when you don't need to inspect application payload, or to avoid SSL termination overhead at the LB. L7 for any HTTP-based routing, SSL offload, or content-based decisions.
> **Common trap:** "L7 is always better because it's smarter" - ignores the latency and complexity cost of two TCP handshakes per request.
> **Next question:** "Your system has both gRPC microservices and HTTP/1.1 REST APIs - one LB or two?" → one L7 LB routing on `Content-Type: application/grpc` vs everything else avoids running and coordinating two separate load-balancing tiers.

### Health Check Design

> 🎯 **Interview Lens**
> **Q:** Your health check queries the database. The DB becomes slow but doesn't fail. What happens?
> **Ideal answer:** All backends fail their health checks simultaneously and get removed from the pool - a complete outage caused by the health check itself. Fix: decouple dependency health from the LB health check; use readiness (local state only) for LB decisions, monitor DB health separately via passive checks (real-traffic 5xx observation) instead.
> **Next question:** "How do you prevent a thundering herd when a backend recovers?" → Slow-start: ramp a recovered backend's traffic weight gradually so it can warm caches before taking full load.

### IP-Based Rate Limiting Through a Load Balancer

> 🎯 **Interview Lens**
> **Q:** How do you rate-limit by client IP when all traffic comes through a load balancer?
> **Ideal answer:** Use X-Forwarded-For or Proxy Protocol to pass the real client IP through. Trust only the last XFF value your own LB appended - earlier values can be client-spoofed. Strip any incoming XFF header at your outermost LB before appending the real IP.
> **Common trap:** Trusting the first or any client-supplied XFF value without stripping - lets an attacker inject a fake IP to bypass rate limiting entirely.

### Diagnosing Silent Connection Failures

> 🎯 **Interview Lens**
> **Q:** Why might a load balancer fail to forward connections even with healthy backends?
> **Ideal answer:** SNAT port exhaustion or conntrack table overflow - LB and backends both report healthy, but new connections fail. Debug with `ss -s` for TIME_WAIT counts and `nf_conntrack_count` vs `nf_conntrack_max`.
> **Next question:** "With DSR, the backend's source IP is its own, not the VIP - won't the client reject the response?" → the backend holds the VIP as a loopback alias so it accepts inbound packets addressed to it, but replies using its own source IP - the client doesn't reject this because it tracks the connection by port tuple, not source IP.

### Safe Production Rollout

> 🎯 **Interview Lens**
> **Q:** How would you roll out a risky backend change to production safely?
> **Ideal answer:** Canary deploy - route 1-5% of traffic to the new version, monitor error rate and latency, automate ramp-up if metrics stay within SLO. The LB is the control plane; the metrics pipeline is the safety gate.
> **Common trap:** "Deploy to staging and test" - staging traffic is synthetic, it won't catch issues specific to real user behavior or geography.
> **Next question:** "How do you ensure the canary gets a representative sample, not just a random 5%?" → Consistent-hash on user ID so the same users consistently land on v2 - avoids a user seeing different behavior request-to-request and makes canary results representative.

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Expansion                              |
| ------- | -------------------------------------- |
| GSLB    | Global Server Load Balancing           |
| VRRP    | Virtual Router Redundancy Protocol     |
| VIP     | Virtual IP                             |
| DSR     | Direct Server Return                   |
| SNI     | Server Name Indication                 |
| SNAT    | Source Network Address Translation     |
| ALPN    | Application-Layer Protocol Negotiation |
| ECMP    | Equal-Cost Multi-Path Routing          |
| STONITH | Shoot The Other Node In The Head       |

### Algorithm Selection Decision Matrix

| Condition                                    | Recommended Algorithm                              |
| -------------------------------------------- | -------------------------------------------------- |
| Homogeneous backends, uniform request cost   | Round Robin                                        |
| Variable request processing time             | Least Connections                                  |
| Backend affinity needed, stable pool         | Consistent Hashing                                 |
| Backend affinity needed, clients behind NAT  | Cookie-based stickiness                            |
| Heterogeneous backend capacity               | Weighted Round Robin or Weighted Least Connections |
| Need real-time backend performance awareness | Least Response Time or Resource-Based              |

### Anti-Patterns

- **Sticky sessions as a crutch:** Masking stateful backends instead of externalizing session state. Creates uneven load and fragile failover.
- **L7 for raw TCP:** Using an HTTP-parsing LB for non-HTTP TCP traffic (databases, game servers). Adds unnecessary overhead and breaks the protocol.
- **Ignoring connection drain:** Deploying without drain configuration causes in-flight request failures on every deploy.
- **Single LB without HA:** The LB itself becomes the SPOF it was meant to eliminate.
- **Health check endpoint doing too much:** A `/health` endpoint that queries the database causes health check failures to cascade into backend removal storms under DB load.
