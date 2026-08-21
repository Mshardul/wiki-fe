# Load Balancer Traffic Distribution Algorithms

## Prerequisites

- **[Load Balancer](./load-balancer.md)** [Must read]
- **[Consistent Hashing](../algorithms/consistent-hashing.md)** [Should read]

---

## Table of Contents

- [Conceptual Foundations & Mental Models](#conceptual-foundations--mental-models)
- [Round Robin & Weighted Round Robin](#round-robin--weighted-round-robin)
- [Least Connections & Weighted Least Connections](#least-connections--weighted-least-connections)
- [Deterministic IP Hashing](#deterministic-ip-hashing)
- [Least Response Time](#least-response-time)
- [Consistent Hashing](#consistent-hashing)
- [Resource-Based / Adaptive Routing](#resource-based--adaptive-routing)
- [Algorithm Cheat Sheet](#algorithm-cheat-sheet)
- [Quick Decision Guide](#quick-decision-guide)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

A load balancing algorithm answers one question: given N healthy backends, which one gets this request? Round Robin and Least Connections handle uniform vs variable request cost; Deterministic IP Hashing and Consistent Hashing add backend affinity, with Consistent Hashing solving the reshuffle problem that plain modulo hashing has when the pool resizes. The real trade-off is state and affinity versus simplicity - the more an algorithm needs to remember, the better it distributes uneven load but the more fragile it is to pool churn. Say it out loud: the algorithm doesn't fix a hot spot caused by a bad key choice, it just routes to it more precisely.

---

## Conceptual Foundations & Mental Models

**Interviewer TL;DR:** Round Robin for uniform workloads; Least Connections for variable ones; Consistent Hashing when backend affinity and pool stability both matter.

**Mental model:** The algorithm answers one question: _given N healthy backends, which one gets this request?_ The right answer depends on whether your requests are uniform (same cost) or variable (some are cheap, some are expensive), and whether the client needs to keep landing on the same backend.

---

## Round Robin & Weighted Round Robin

**Round Robin:** Requests are distributed sequentially across backends. Backend 1 gets request 1, Backend 2 gets request 2, cycling back to Backend 1.

```python
backends = ["server1", "server2", "server3"]
current = 0

def get_backend():
    global current
    backend = backends[current % len(backends)]
    current += 1
    return backend
```

**Weighted Round Robin:** Backends receive proportional traffic. A backend with weight 3 gets 3x more requests than one with weight 1. Used when backends have different capacities.

**Trade-offs:** Works well when requests are uniform in cost and backends are homogeneous. Breaks down when some requests are expensive (long-running queries) and others are cheap - a busy backend receives new requests at the same rate as an idle one.

---

## Least Connections & Weighted Least Connections

Routes each new request to the backend with the fewest active connections at that moment.

**Why it's better for variable workloads:** If one backend is processing 10 slow requests and another is idle, round robin sends the next request to the busy backend by rotation. Least connections sends it to the idle one.

**Weighted Least Connections:** Normalizes by backend capacity: `score = active_connections / weight`. Prevents a weaker backend from being treated as equivalent to a stronger one.

---

## Deterministic IP Hashing

Routes requests from the same client IP to the same backend every time using a hash of the source IP.

```python
import hashlib

def get_backend(client_ip, backends):
    hash_val = int(hashlib.md5(client_ip.encode()).hexdigest(), 16)
    return backends[hash_val % len(backends)]
```

**Use case:** When backend affinity matters for performance (warm caches) but you don't want the overhead of explicit session tracking.

**Critical limitation:** Adding or removing a backend reshuffles all assignments because `% len(backends)` changes. Use consistent hashing to avoid this (see [Consistent Hashing](#consistent-hashing)).

> ⚖️ **Decision Framework**
> Use IP hashing only when: (1) you need backend affinity, (2) your backend pool is stable, and (3) client IP diversity is high. If clients come from behind a NAT (thousands of users sharing one public IP), IP hashing creates severe hot spots - prefer cookie-based stickiness in that case (see [Session Persistence](./load-balancer.md#session-persistence) on the parent page).

---

## Least Response Time

Routes to the backend with the lowest combination of active connections and response latency. More sophisticated than least connections because it accounts for actual backend speed, not just queue depth.

Requires the LB to measure and track response times per backend. Used in HAProxy's `leastconn` + response time mode and Envoy's `LEAST_REQUEST` policy.

**Herding risk:** If one backend is momentarily faster (e.g., a cache warm-up completes), all new requests pile onto it - making it suddenly the slowest. The algorithm then shifts all traffic to the next fastest backend, which also gets overwhelmed. This oscillation ("herding") can cause worse load distribution than round robin under bursty traffic. Mitigation: add a small amount of randomness or jitter to the selection (Envoy's power-of-two-choices: sample 2 backends randomly, pick the faster one - reduces herding while retaining load-awareness).

---

## Consistent Hashing

**The problem it solves:** Simple modulo hashing (`hash(key) % N`) breaks every time N changes. Add one backend to a pool of 10 and ~90% of all key-to-backend mappings change - invalidating affinity for nearly every client at once.

**The mechanism:** Place both backends and keys on a virtual ring of hash values (0 to 2³²). Each key is assigned to the first backend clockwise from it on the ring. When a backend is added or removed, only the keys between it and its nearest neighbour on the ring are remapped - roughly `1/N` of all keys, versus `(N-1)/N` for modulo hashing.

```
Ring (simplified):

    0
    │
  [B1] ← keys in this arc go to B1
    │
  [B2] ← keys in this arc go to B2
    │
  [B3] ← keys in this arc go to B3
    │
   2³²
```

**Virtual nodes:** A single backend placed once on the ring creates uneven arc sizes - one backend may own 40% of the ring, another 10%. Virtual nodes fix this: each physical backend is hashed to many positions on the ring (e.g., 150 virtual nodes per backend). The arcs average out to roughly equal distribution.

**In load balancing context:** The key is typically a session ID, user ID, or request attribute - not the source IP (which collapses behind NAT). Consistent hashing is the right choice when you need backend affinity _and_ your pool changes frequently (autoscaling, rolling deploys).

🔗 Deep-Dive: [Consistent Hashing](../algorithms/consistent-hashing.md) - Ring math, virtual node tuning, rebalancing impact, and bounded load extensions.

---

## Resource-Based / Adaptive Routing

The LB queries each backend for current resource utilization (CPU, memory, queue depth) and routes to the least loaded. Requires backends to expose a metrics endpoint.

Used in sophisticated service meshes and internal LBs where backends have heterogeneous workloads. Adds periodic polling overhead and operational complexity. Rarely seen at the internet edge.

---

## Algorithm Cheat Sheet

| Algorithm                  | Core Mechanism                                   | Best For                               | Key Weakness                                                                                     | LB State Required            |
| --------------------------- | ------------------------------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| Round Robin                 | Sequential cycling across backends                | Uniform requests, homogeneous backends  | Ignores in-flight load - busy and idle backends get equal traffic                                   | None                           |
| Weighted Round Robin        | Sequential cycling with proportional weights      | Mixed-capacity backends                 | Still ignores in-flight load                                                                        | Weight config only             |
| Least Connections            | Route to backend with fewest open connections     | Variable request cost                   | 1 slow connection = 1 fast connection - doesn't reflect actual load                                 | Per-backend counter            |
| Weighted Least Connections   | Least connections normalized by backend capacity  | Mixed capacity + variable cost          | Same blind spot as least connections                                                                | Counter + weights              |
| Deterministic IP Hash        | `hash(source IP) % N` to pick backend             | Backend affinity, stable pools          | NAT collapses many users to one IP → hot spots; pool resize reshuffles all assignments              | None                           |
| Consistent Hashing           | Key mapped to virtual ring; nearest node wins     | Affinity + dynamic pool (adds/removes)  | Requires a good key (avoid IP for NAT clients); virtual node tuning needed for even distribution    | Ring state                     |
| Least Response Time          | Fewest connections + lowest observed latency      | Heterogeneous backend speed             | Measurement overhead; can overreact to transient latency spikes                                     | Per-backend latency tracking   |
| Resource-Based / Adaptive    | Route based on backend-reported CPU/memory/queue  | Heterogeneous internal workloads        | Requires backends to expose metrics; polling adds lag; rarely worth complexity at the edge          | External metrics poll          |

**Key Takeaway:** Round Robin for uniform workloads; Least Connections when request cost varies; Consistent Hashing when you need affinity and the pool changes. IP Hash is a trap behind NAT - cookie-based stickiness is almost always safer.

---

## Quick Decision Guide

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
                    ├─ YES ──▶ Cookie-based stickiness (see parent: Session Persistence)
                    │
                    └─ NO
                         │
                         ▼
                       Backend pool stable (rare adds/removes)?
                         ├─ YES ──▶ Consistent Hashing (→ #consistent-hashing)
                         └─ NO  ──▶ Cookie-based stickiness (see parent: Session Persistence)
```

**Real-world usage:** HAProxy defaults to round robin; Envoy defaults to weighted round robin with an option for `LEAST_REQUEST` (power-of-two-choices). At scale, ring imbalance in consistent hashing becomes visible past a few thousand nodes without enough virtual nodes per physical backend - monitor per-backend key-count variance, not just connection count.

---

## Production Failure Modes & Gotchas

**Interviewer TL;DR:** Hot spots from a bad hash key are the most common algorithm-selection failure - they hide behind "normal-looking" connection metrics.

### Hot Spots from Poor Hash Key Selection

**Scenario:** IP hashing with clients behind corporate NAT. Thousands of users share one public IP → all routed to one backend → that backend is overwhelmed while others are idle.

**Detection:** Severe backend connection imbalance. One backend at 100% CPU, others near-idle.

**Fix:** Switch to cookie-based stickiness or consistent hashing with a better key (session ID, user ID instead of IP).

> **⚠️ Common Traps & How to Recover**
>
> - **Trap:** Only monitoring connection counts per backend - one backend looks "normal" in connections but is CPU-maxed. **Recovery:** Add per-backend RPS and CPU metrics to your dashboard.
> - **Trap:** Assuming IP diversity is high because your users are geographically spread. **Recovery:** Check actual unique source IPs in LB access logs - corporate NAT collapses thousands of users to one IP.
> - **Trap:** Switching hash keys mid-traffic without a migration plan. **Recovery:** Gradually shift to cookie-based stickiness first; remap sessions during low-traffic window.

### Common Misconceptions

- **"A smarter algorithm fixes uneven load"** - it doesn't fix a bad key choice; consistent hashing routed to a hot IP is still a hot spot, just a more stable one.
- **"Least connections is always the safe default"** - a backend holding 1 connection running a slow 30-second query still looks under-loaded by connection count; least response time factors in actual latency.

**Key Takeaway:** Hot spots almost always come from the key, not the algorithm - check IP diversity and session-ID cardinality before blaming the routing logic.

---

## Interview Scenario Bank

### Algorithm Selection Under Variable Load

> 🎯 **Interview Lens**
> **Q:** When does least connections outperform round robin?
> **Ideal answer:** When request processing time varies significantly (some queries take 1ms, others 500ms) - round robin ignores in-flight load, least connections is load-aware.
> **Common trap:** Assuming least connections is always correct - a backend with 1 connection that's a slow 30-second query still gets new requests routed to it, since it counts connections, not actual load. Least response time fixes this by factoring in observed latency.
> **Next question:** A backend's connection count looks normal but its CPU is pegged - what algorithm change would you consider, and why doesn't least connections catch this? → Least response time or resource-based routing, because connection count alone doesn't reflect actual per-connection cost.

### Diagnosing an Overloaded Backend Despite Even Routing

> 🎯 **Interview Lens**
> **Q:** Your load balancing algorithm distributes evenly by connection count, yet one backend is consistently at 100% CPU while others sit idle - what's your first hypothesis?
> **Ideal answer:** Check the routing key's cardinality first - if requests are keyed on something that collapses many distinct clients into one bucket (e.g. source IP behind a shared NAT), even a "fair" algorithm will concentrate load on one backend.
> **Common trap:** Assuming the algorithm itself is broken and switching to a different one without checking key diversity first - the new algorithm will hit the same wall if the key is the problem.
> **Next question:** How would you migrate away from that key without dropping active sessions? → Gradually shift new connections to a better key (e.g. cookie-based) while letting existing sessions drain naturally, rather than a hard cutover.

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| ------- | --------- | ------------------ |
| NAT     | Network Address Translation | Many clients share one public IP, collapsing IP-based routing keys |
| RPS     | Requests Per Second | Throughput unit used to detect per-backend load imbalance |

### Anti-Patterns

- **IP hashing as a default affinity mechanism** - fails silently behind NAT; use cookie-based stickiness or a better key instead.
- **Trusting connection count as a load proxy** - hides slow, expensive requests sitting on a "lightly loaded" backend; pair with latency or resource metrics.
- **Switching hash keys without a migration plan** - reshuffles all affinity at once, right when you're trying to fix a hot spot, not add a new one.
