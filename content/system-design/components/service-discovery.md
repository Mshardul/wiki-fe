# Service Discovery

## Prerequisites

- **[Load Balancer](./load-balancer.md)** [Must read]
- **[DNS](./dns.md)** [Should read]
- **CAP Theorem** [Should read] <!-- link: ../algorithms/cap-theorem.md -->

---

## Table of Contents

- [TLDR](#tldr)
- [Mental Model](#mental-model)
- [Client-Side vs Server-Side Discovery](#client-side-vs-server-side-discovery)
- [Core Mechanisms](#core-mechanisms)
- [Registry Consistency Model](#registry-consistency-model)
- [Quick Decision Guide](#quick-decision-guide)
- [Comparison / Selection Matrix](#comparison--selection-matrix)
- [Security & Hardening](#security--hardening)
- [Deployment Contexts](#deployment-contexts)
- [Observability & Debugging](#observability--debugging)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

Service discovery is how a caller finds a currently-reachable instance of a service whose set of instances changes constantly - scaling events, deploys, and crashes all rewrite the answer. The core decision isn't "how do we store addresses," it's **who resolves the instance list and how fast does a dead one get evicted**: a slow-to-evict registry trades false negatives (healthy instance looks dead) against false positives (dead instance still gets traffic) under every heartbeat interval you pick. A load balancer is one common consumer of discovery's output, not a replacement for it. Getting this wrong shows up as call failures during scale-out or deploys, not at steady state.

**Interview soundbite:** "Service discovery's real problem isn't storing IP addresses, it's disagreeing safely - every registry has to pick how long it tolerates believing a lie, either that a dead instance is alive or a live one is dead."

---

## Mental Model

**A phone book that rewrites itself every few seconds.** In a static deployment you'd hardcode `payments-service` at a fixed IP; in an elastic one, `payments-service` might be nine different IPs this minute and eleven a minute from now, with some of those instances mid-deploy or mid-crash. Service discovery is the mechanism that keeps a queryable, roughly-current answer to "which addresses currently answer to this service name," so callers never hardcode an address that a rolling deploy or an autoscaler event immediately invalidates.

The three moving parts every implementation has, regardless of vendor: **registration** (an instance announces "I exist, reach me here"), **health checking** (something verifies the announcement is still true), and **resolution** (a caller asks "give me a live instance" and gets an answer). Every design decision in this article is a choice about how those three parts interact under network partitions, restarts, and scale.

---

## Client-Side vs Server-Side Discovery

⚖️ **Decision Framework**

| | Client-Side Discovery | Server-Side Discovery |
| --- | --- | --- |
| Who queries the registry | The calling service itself | A load balancer / proxy in front of the callee |
| Who picks the instance | The client (embeds LB logic) | The intermediary |
| Extra network hop | No - client connects directly to the chosen instance | Yes - client → LB → instance |
| Client complexity | Higher - every client needs a discovery-aware library | Lower - client just calls a stable endpoint/DNS name |
| Polyglot fleets | Harder - every language needs a client library | Easier - the LB is language-agnostic |
| Examples | Netflix Eureka + Ribbon, Consul with a client-side library | Kubernetes Service (kube-proxy/iptables or IPVS), any [load balancer](./load-balancer.md) fronting a registry |

**Client-side discovery**: the calling service queries the registry directly, applies its own load-balancing policy (round robin, least-connections, latency-aware), and connects straight to the chosen instance. This removes a hop and its latency, but pushes discovery-library maintenance into every service and every language in the fleet - a Python service and a Go service both need working, up-to-date clients for the same registry protocol.

**Server-side discovery**: the caller doesn't talk to the registry at all - it calls a stable name or VIP, and a load balancer or proxy sitting behind that name is the one who queries the registry and picks an instance. This is the shape of a Kubernetes `Service`: pods never query `etcd` themselves, they hit a ClusterIP and `kube-proxy` (or an equivalent dataplane) has already programmed the routing rules from watching the API server. Server-side discovery centralizes the load-balancing logic and keeps clients dumb, at the cost of an extra hop and the LB/proxy layer itself becoming something that needs to scale and stay healthy.

🧠 **Thought Process:** the deciding question is "how many languages am I supporting, and do I already have a proxy layer in the request path?" A single-language shop with no existing service mesh can justify client-side libraries; a polyglot fleet or one already running a sidecar proxy (see [Deployment Contexts](#deployment-contexts)) gets server-side discovery almost for free, because the proxy is already intercepting every call.

---

## Core Mechanisms

### Registration

An instance's presence in the registry gets there one of two ways. **Self-registration**: the instance itself calls the registry on startup (`PUT /register`) and on shutdown (`DELETE /register`), and is responsible for keeping its entry alive (see heartbeating below). This is simple but couples every service's code to the registry's API and means a crash (as opposed to a graceful shutdown) leaves a stale entry until health checking catches it. **Third-party registration**: an external registrar - a sidecar, an orchestrator's control plane, a dedicated registrar process - watches the platform's actual instance lifecycle (container start/stop events, Kubernetes pod status) and registers/deregisters on the service's behalf. This decouples application code from the registry entirely and is what Kubernetes does: the kubelet and API server manage pod lifecycle, and `Endpoints`/`EndpointSlice` objects are derived from that ground truth, not from anything the application calls.

### Health Checking

A registry entry existing is not the same as the instance being reachable. Three common shapes, increasing in how directly they verify reachability:

- **Heartbeat / TTL**: the instance (or its sidecar) periodically pings the registry; if no ping arrives within a TTL window, the entry expires. Cheap, but only proves the instance can reach the registry, not that it can serve traffic.
- **Active health checks**: the registry (or a health-checking subsystem) polls each instance's `/health` endpoint on an interval. Proves the instance's own view of its health, including downstream dependency checks the instance chooses to expose.
- **Passive / outlier detection**: the dataplane that's already routing live traffic tracks per-instance error rates and ejects an instance that starts failing real requests, without waiting for the next poll interval. Catches failures fastest because it uses real traffic as the signal, but needs traffic flowing to detect anything - it can't catch a cold instance that never received a request.

Production systems commonly layer these: TTL/heartbeat for coarse liveness, active checks for readiness (can this instance take new traffic right now, distinct from is-it-alive), and passive ejection for fast reaction on the hot path.

### Resolution

A caller resolving "give me an instance of `X`" gets one of a few answer shapes: a full instance list to load-balance over client-side, a single pre-selected instance (server-side discovery already picked), or a DNS answer (one or more A/SRV records, see [DNS-Based Discovery](#dns-based-discovery-vs-a-dedicated-registry)). The resolution path is the one that runs on every request (or every connection, if pooled) - it has to be fast and it has to tolerate the registry being briefly unreachable, which is why almost every real client caches the last-known-good answer rather than blocking on a live registry call per request.

### DNS-Based Discovery vs a Dedicated Registry

The simplest possible implementation reuses [DNS](./dns.md): a service name resolves to one or more instance IPs via A or SRV records, refreshed on TTL expiry. This needs no new infrastructure and every language already has a DNS resolver, but DNS was not built for the change frequency or the metadata service discovery needs - TTLs are commonly cached far past their stated value by resolvers and OS stub resolvers that don't fully respect TTL semantics, SRV records carry port and priority/weight but nothing about custom health state or version metadata, and propagating a deregistration can lag well behind an instance actually going down. A dedicated registry (Consul, etcd-backed systems, Kubernetes' own API) trades that simplicity for push-based or fast-poll updates, richer metadata (version tags, health status, zone), and sub-second-to-low-seconds convergence instead of DNS-TTL-bound convergence.

---

## Registry Consistency Model

⚖️ **Decision Framework**

The registry itself is a distributed system with its own CAP trade-off, and the choice shows up directly as user-visible behavior:

| | CP Registry (e.g. etcd, ZooKeeper) | AP Registry (e.g. Eureka) |
| --- | --- | --- |
| Under a network partition | May refuse reads/writes on the minority side rather than risk stale data | Keeps serving reads from whatever it has, even if stale |
| Failure mode | A discovery query can fail outright during partition/leader election | A discovery query can return an instance that's actually already dead or already gone |
| Why you'd pick it | Discovery answer must never be wrong (e.g. distributed lock leader election reusing the same store) | Discovery must always answer something - a stale instance list is recoverable (caller retries elsewhere), no answer at all is not |
| Practical implication | Registry unavailability blocks new connections fleet-wide during the partition | Callers must already tolerate connecting to a dead instance (retry/circuit-breaker) |

Eureka's own design writeup states this explicitly as a deliberate choice: it would rather hand out a slightly stale list than stop answering, because a caller that gets a dead instance can retry against another one, but a caller that gets no answer has no recourse at all. This is why almost every service-discovery client is paired with connection-level retry/circuit-breaking regardless of which registry model is behind it - see [Production Failure Modes & Gotchas](#production-failure-modes--gotchas).

🧠 **Thought Process:** ask "what does a wrong answer cost versus what does no answer cost?" For routing live user traffic, no-answer is almost always worse than stale-answer, which is why AP registries dominate general-purpose service discovery even though CP stores (etcd, ZooKeeper) are the right choice for the leader-election / distributed-lock use cases layered on top of the same infrastructure.

---

## Quick Decision Guide

- **Already running a service mesh or sidecar proxy** (Istio, Linkerd, any Envoy-based dataplane) → use its built-in discovery; don't stand up a second registry the mesh will fight with.
- **Single orchestrator, no polyglot mesh need** → the orchestrator's native discovery (Kubernetes `Service`/`EndpointSlice`) is free and already wired to real pod lifecycle - don't add Consul/Eureka on top without a concrete gap it fills.
- **Polyglot fleet, no existing proxy layer, need client-side load-balancing logic** → a dedicated registry (Consul, Eureka) with per-language client libraries.
- **Static or slow-changing topology, low ops budget** → DNS-based discovery is enough; the TTL-lag trade-off only bites when instance churn is frequent.
- **Cost angle**: a dedicated registry cluster (Consul/etcd/ZooKeeper, typically 3-5 nodes for quorum) is an always-on cost independent of the services it tracks; reusing an orchestrator's built-in discovery or DNS avoids that standing cost but caps you at that platform's convergence speed and metadata richness. Managed registry/mesh offerings trade that operational burden for a per-node or per-request fee - worth it once someone is paying to run quorum nodes by hand anyway.

---

## Comparison / Selection Matrix

| | DNS-Based | Consul | Kubernetes native | Eureka |
| --- | --- | --- | --- | --- |
| Convergence speed | TTL-bound (seconds to minutes, often worse due to caching resolvers) | Sub-second gossip + health-check driven | Seconds (watch-based push from API server) | Seconds (heartbeat-driven, AP) |
| Consistency model | N/A (DNS has no health awareness) | CP for KV store, gossip for membership | CP (backed by etcd) | AP by design |
| Extra infra to run | None (reuses existing DNS) | Dedicated Consul cluster | None if already on Kubernetes | Dedicated Eureka cluster |
| Metadata richness | Minimal (SRV priority/weight only) | Rich (tags, health checks, KV store) | Rich (labels, annotations, readiness) | Moderate (metadata map) |
| Best fit | Static/low-churn topologies, minimal ops | Polyglot fleets, VM-based infra, need KV+discovery combined | Already-Kubernetes workloads | Legacy JVM/Spring Cloud fleets |

---

## Security & Hardening

⚠️ **Warning / Gotcha:** an unauthenticated registry is an open invitation for **registry poisoning** - anything on the network can register itself as `payments-service` and start receiving live traffic meant for the real thing. Registries should require registration to be authenticated (mTLS client certs, a service-account token) and, where the platform supports it, restrict who can register under a given service name to workloads the orchestrator itself attests to (Kubernetes' `ServiceAccount`-scoped RBAC on `Endpoints` writes is the concrete version of this).

Traffic between a caller, the registry, and the resolved instance should run over [mTLS](./mtls.md) wherever it crosses a trust boundary - the registry answer is only as trustworthy as the channel it and the resulting connection travel over. Read access to the registry is itself sensitive: a full instance list leaks internal topology (instance counts, IPs, service names) to anything that can query it, so read-side authorization matters as much as write-side.

---

## Deployment Contexts

**Sidecar / service mesh**: a proxy (Envoy, linkerd-proxy) runs alongside every instance and handles discovery, load balancing, retries, and mTLS transparently - the application code never calls a discovery API at all, it just makes a normal outbound call and the sidecar intercepts it. This is server-side discovery pushed all the way down to per-instance granularity rather than a shared central LB tier.

**Orchestrator-native**: Kubernetes is the dominant example - `Service` objects give a stable virtual IP and DNS name, `EndpointSlice` objects are the live, orchestrator-maintained registry (derived from pod readiness, not a heartbeat protocol you build), and `kube-proxy` (or an eBPF-based equivalent) programs the actual packet-forwarding rules so a pod-to-pod call never explicitly "queries" anything at request time.

**Dedicated registry**: Consul, Eureka, or a raw etcd/ZooKeeper deployment used as the discovery backing store directly, common in VM-based or pre-Kubernetes infra and in polyglot fleets that predate a shared mesh.

**Multi-region / multi-cluster**: discovery has to decide whether cross-region calls are even eligible answers - a naive global registry can hand a caller in `us-east` an instance in `ap-south`, which is technically alive but adds cross-region latency the caller never asked for. Real deployments scope resolution to prefer same-zone/same-region instances first and only fail over cross-region as a deliberate, explicit decision (locality-aware load balancing), not an accident of the registry not knowing about geography.

---

## Observability & Debugging

The signal that matters most is **registry-to-reality drift**: the gap between what the registry claims is alive and what's actually reachable, which shows up as call failures that don't correlate with any application-level error. Concretely, monitor: registration/deregistration event rate (a spike means a mass restart or a crash loop, not necessarily a problem with discovery itself), health-check failure rate per instance and per zone (a zone-wide spike points at a network partition, not individual instance failures), and time-to-detect (the gap between an instance actually dying and its entry disappearing from the registry - this number is your worst-case blast radius for stale-route calls).

When debugging "caller says the service is down but it's clearly running," the checklist is: is the instance registered at all (registration bug), is its health check passing (readiness bug, distinct from liveness), is the caller's cached resolution stale (client-side cache TTL not yet expired), and is there a network partition between the caller's zone and the registry's zone that would explain a stale-but-locally-consistent view.

---

## Production Failure Modes & Gotchas

### Thundering Herd on Registry Recovery

If a registry cluster restarts or a partition heals, every client with an expired or invalidated cache re-resolves simultaneously, hammering the registry with a burst of reads exactly when it's least warmed up. Mitigate with jittered re-resolution intervals and client-side caching that survives brief registry unavailability rather than treating a failed lookup as "no instances exist."

### Split-Brain - Quorum, Fencing

A registry built on a consensus store (etcd, ZooKeeper) can itself split during a network partition, producing two sub-clusters that each believe they're authoritative. Quorum-based writes (require a majority partition to accept changes) and fencing tokens (a monotonically increasing epoch attached to leadership, so a stale ex-leader's writes are rejected) are the standard mitigations - this is the general distributed-consensus problem, not something service discovery invents on its own.

### Zombie Instances

An instance can crash hard enough (SIGKILL, OOM-kill, host failure) that it never runs its own deregistration code path - self-registration's core weakness. It stays in the registry as a "live" entry until a TTL expires or an active health check fails, and any caller that resolves during that window sends a request into a void. This is the direct argument for pairing self-registration with an independent health-check mechanism rather than trusting graceful-shutdown deregistration alone.

### Split Views During Rolling Deploy

Mid-rollout, different callers can legitimately see different valid instance sets - some resolved before the new version registered, some after - if the registry doesn't propagate atomically to every client at once (and none do, at any real scale). This is expected, not a bug, but it means a rolling deploy that assumes "all traffic switches over at once" is wrong; connection draining and readiness gating (don't mark new instances ready until they can actually serve) are what keep this from causing errors.

### Common Misconceptions

- **"The registry is the source of truth for whether an instance is healthy."** It's a source of truth for whether an instance is *registered and last known reachable* - the gap between those two things is exactly the TTL/health-check interval, and it's never zero.
- **"Service discovery replaces the need for retries."** It reduces how often a caller reaches a dead instance, it doesn't eliminate it - the registry answer can be stale the instant it's returned, so callers still need connection-level retry/circuit-breaking (see Zombie Instances above).
- **"DNS-based discovery and a dedicated registry solve the same problem at different scales."** They differ in kind, not just scale - DNS has no concept of application-level health, only "does this name resolve," so no amount of scale-up fixes DNS's blindness to a process that's up but not ready.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Callers of a service intermittently get connection-refused errors for about 10 seconds after every deploy, even though the new instances pass their readiness checks almost immediately. What's happening and what would you change?
> **Ideal answer:** The old instances are being terminated before callers' cached resolutions expire, or new instances are registered before they're actually ready to accept connections - either direction of the rollout is racing the propagation delay between "instance state changed" and "every caller's view updated." Fix by draining connections on the old instance before deregistering it and gating registration/readiness on an actual health check passing, not just process-start.
> **Common trap:** Blaming the load balancer's algorithm instead of the registration/deregistration timing - the LB is only as correct as the instance list it's given.
> **Next question:** How would you verify which side (early registration vs late deregistration) is actually causing it, without guessing?
> **Next question:** If this fleet spans three availability zones, does the fix change?

> 🎯 **Interview Lens**
> **Q:** You're choosing the backing store for a new discovery system and someone on the team says "just use whatever gives the strongest consistency guarantee, that's obviously safest." Do you agree?
> **Ideal answer:** No - for discovery specifically, refusing to answer during a partition (a CP choice) can be worse than answering with slightly stale data (AP), because a stale answer is recoverable via retry but no answer at all blocks the caller outright. Strong consistency is the right call for the leader-election/lock use cases sharing the same underlying store, not necessarily for the discovery-read path itself.
> **Common trap:** Treating "consistency" as a single global dial that should always be maximized, rather than asking what a wrong answer costs on this specific read path.
> **Next question:** Given that, what would make you choose a CP-backed registry anyway for a specific service?

> 🎯 **Interview Lens**
> **Q:** A service migrating from a monolith to microservices asks whether they need a dedicated registry like Consul from day one. How do you advise them?
> **Ideal answer:** Depends on what they're already running - if they're deploying to Kubernetes, native `Service`/`EndpointSlice` discovery is free and already correct; if they're on plain VMs with a handful of slow-changing services, DNS-based discovery might be enough; a dedicated registry earns its keep once there's real instance churn, polyglot clients needing shared discovery logic, or metadata needs DNS can't express.
> **Common trap:** Reaching for the most feature-rich tool (Consul/Eureka) reflexively, adding an operational dependency the platform they're already on would have given them for free.
> **Next question:** What's the concrete signal that tells them they've outgrown DNS-based discovery?

> 🎯 **Interview Lens**
> **Q:** Your health checks are all green, but 2% of requests still hit an instance that's actually overloaded and slow to respond. Is that a service discovery problem?
> **Ideal answer:** Partially - active health checks (is the process up and does `/health` return 200) don't measure current load or tail latency, only binary liveness/readiness. Closing that gap needs either passive outlier detection watching real request latency/error rate, or load-aware routing (least-outstanding-requests) at the layer consuming the discovery output, not a change to the registry itself.
> **Common trap:** Assuming a green health check is the same signal as "this instance is currently a good place to send a request."
> **Next question:** Where would you add outlier detection in a system that currently only does active `/health` polling?

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| TTL | Time To Live | How long a cached answer (DNS record, registry entry) is trusted before requiring refresh |
| SRV | Service Record | A DNS record type carrying host, port, priority, and weight for a named service |
| VIP | Virtual IP | A stable IP address that maps to a changing set of real backend instances |
| CP / AP | Consistent-Partition-tolerant / Available-Partition-tolerant | The two reachable corners of CAP under an actual network partition |

### Anti-patterns

- **Hardcoding instance IPs in config** - defeats the purpose of discovery entirely; any scale-out, restart, or failover requires a manual config change and a redeploy. Use a service name resolved at connection time instead.
- **Trusting self-reported deregistration as the only liveness signal** - a hard crash never runs the deregistration code path; pair it with an independent health check (see Zombie Instances).
- **Treating the registry as a general-purpose database** - registries are optimized for high-frequency reads of small, ephemeral records, not for storing configuration, secrets, or business data alongside instance entries.
- **Resolving on every single request with no client-side cache** - turns the registry into a hard dependency on the request hot path; cache the last-known-good answer and refresh on an interval or push, not synchronously per call.

### Selection Matrix

See [Comparison / Selection Matrix](#comparison--selection-matrix) above.
