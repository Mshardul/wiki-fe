# CDN

## Prerequisites

- **[Caching](../components/caching.md)** [Must read]
- **[DNS](../components/dns.md)** [Must read]
- **[Consistent Hashing](../algorithms/consistent-hashing.md)** [Should read]

---

## Table of Contents

- [Core Mechanisms](#core-mechanisms)
- [Quick Decision Guide](#quick-decision-guide)
- [Cache Invalidation at the Edge](#cache-invalidation-at-the-edge)
- [Origin Offload & Origin Shield](#origin-offload--origin-shield)
- [Dynamic & Personalized Content at the Edge](#dynamic--personalized-content-at-the-edge)
- [Security & Hardening](#security--hardening)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

A CDN is a geographically distributed network of edge servers (PoPs) that caches content close to users, so a request never has to cross the planet to reach the origin. The core decision it enables is where a request gets served from - edge cache hit, origin shield, or full origin round-trip - and that decision is driven by DNS/anycast routing, not application logic. The hard part isn't caching itself (see [Caching](../components/caching.md) for eviction and write-strategy theory) - it's propagating invalidations across hundreds of PoPs consistently and keeping origin load bounded when millions of edge nodes could otherwise stampede it simultaneously. A CDN turns "how fast is my server" into "how fast is the nearest copy of my data," at the cost of a purge-latency window and a new layer of cache-key correctness to get right.

**Interview soundbite:** A CDN's real engineering problem isn't serving cached bytes fast - anyone can do that - it's making a purge propagate to hundreds of PoPs before "fast but wrong" does more damage than "slow but right."

---

## Core Mechanisms

**Mental model:** Think of a CDN as caching's answer to physics - no matter how fast your origin is, a request from Mumbai to a origin in Virginia pays ~250ms of speed-of-light tax before your server even sees it. A CDN doesn't make the origin faster; it moves a copy of the answer physically closer to the question.

### Points of Presence (PoPs) & Edge Servers

A PoP is a physical or virtual data center location running edge cache servers, positioned at internet exchange points close to population centers. Large providers operate hundreds to thousands of PoPs globally; each PoP holds a partial, LRU/LFU-evicted subset of the full origin content set - not a full mirror. A single PoP typically serves a metro region or a small cluster of countries, and connects upstream either directly to the origin or through a mid-tier relay (see [Origin Offload & Origin Shield](#origin-offload--origin-shield)).

### Request Routing - Anycast vs DNS-Based

Two mechanisms decide which PoP a given client request lands on:

**Anycast:** The same IP address is advertised from every PoP via BGP. Internet routing (shortest AS-path, not literal geographic distance) delivers the packet to the topologically nearest PoP with no client-side logic involved. Fails over automatically if a PoP withdraws its route - the next-nearest PoP absorbs traffic within normal BGP convergence time (seconds, not the minutes a DNS TTL would cost).

**DNS-based (GeoDNS) routing:** The CDN's authoritative DNS server resolves the CDN hostname to a different PoP IP depending on the resolver's (not necessarily the client's) geographic location, often combined with latency probing and PoP health data. Gives finer-grained control (per-ISP routing, weighted traffic shifting, real-time load-aware steering) than anycast, but inherits DNS's caching/TTL lag - failover is bounded by TTL, not instant.

> ⚖️ **Decision Framework**
> Anycast wins on failover speed and operational simplicity (one IP, BGP handles the rest) - the trade-off is coarser control, since you can't easily weight traffic away from an overloaded-but-still-healthy PoP. DNS-based routing wins on steering precision - you can shed load from a specific PoP or route around a soft-degraded (not fully down) node - at the cost of TTL-bounded failover and resolver-location inaccuracy (a resolver in one region can serve clients in another, especially with third-party DNS like public resolvers). Most large CDNs run both: anycast for entry, DNS/HTTP-layer steering for fine control within the anycast catch.

### Cache-Hit Path vs Cache-Miss Path

On a hit, the edge server serves the response directly from local storage - no origin contact, latency bounded by client-to-PoP RTT (single-digit to low double-digit ms within-region). On a miss, the edge server (or the origin shield in front of it) fetches from origin, stores a copy per the response's cache directives, and returns it to the client - latency is edge-to-origin RTT plus origin processing time, which can be tens to hundreds of ms depending on geography.

The response is cacheable or not based on standard HTTP caching semantics - `Cache-Control`, `ETag`, `Vary` (see [Caching § CDN as Edge Cache](../components/caching.md#cdn-as-edge-cache-l3---http-cache-semantics-cache-control-directives-etag-vary-stale-while-revalidate) for the full header table and the `Vary` footgun). A CDN's cache-key construction determines what counts as "the same request" - by default this is method + host + path + query string, but can be customized to strip tracking query params or fold in specific headers.

```
Client
  │  (anycast/GeoDNS routes to nearest PoP)
  ▼
Edge PoP ──── cache hit? ──yes──▶ Serve from edge (1-10ms)
  │
  no (miss)
  ▼
Origin Shield ── cached (from an earlier PoP's miss)? ──yes──▶ Serve to PoP, PoP caches + serves client
  │
  no (shield also misses)
  ▼
Origin ──▶ Response flows back: Origin → Shield (caches) → PoP (caches) → Client
```

### Cache-Key Construction & Fragmentation

The cache key is the internal identifier the edge uses to look up a stored response - it is not always the literal request URL. Two requests with the same URL but different `Vary`-listed header values produce different cache entries under the same key namespace. A CDN configured to include an unnecessary dimension in the cache key (a session ID query param, a full `User-Agent` string) fragments the cache: instead of one shared entry serving all users, every unique combination of the key gets its own copy, and hit rate collapses even though the underlying content is identical for everyone.

**Mitigation:** Strip tracking/session query parameters from the cache key explicitly (most CDNs support an allowlist or a normalize-query-string setting). Only vary on headers that produce genuinely different responses.

---

## Quick Decision Guide

**Mental model:** A CDN is worth the added infrastructure and cache-correctness complexity specifically when content is requested repeatedly by geographically distributed clients and can tolerate a bounded staleness window - the same cost/benefit lens as caching in general (see [Caching § Quick Decision Guide](../components/caching.md#quick-decision-guide)), applied at the network-edge layer instead of the application layer.

### When to Put a CDN in Front

- Static assets (JS/CSS bundles, images, video segments, downloadable files) that are identical for every user
- API responses that are public and cacheable for a bounded window (product catalogs, public leaderboards)
- Traffic with meaningful geographic spread - a single-region user base gets little benefit from edge distribution
- Origin protection is needed against traffic spikes (flash sales, viral content, DDoS absorption)

### When Not To

- Fully personalized responses with no shared cacheable subset (a user's private dashboard rendered server-side per-request) - near-zero hit rate, the CDN just adds a hop
- Strict real-time correctness requirements where even a few seconds of edge staleness is unacceptable (live inventory during a flash sale, financial quote feeds) - unless paired with short TTLs and CDN-level real-time purge, at which point the operational cost may exceed the benefit
- Traffic is single-region and already colocated with the origin - anycast/PoP routing adds negligible value over a well-tuned regional load balancer

### CDN vs Application Cache vs Reverse Proxy Cache

| Aspect | CDN | Application Cache (Redis/L1) | Reverse Proxy Cache (Varnish/Nginx) |
| --- | --- | --- | --- |
| Placement | Network edge, geographically distributed | Colocated with app servers | In front of origin, single location |
| What it caches | HTTP responses (static + cacheable dynamic) | Arbitrary data (query results, sessions, computed values) | HTTP responses only |
| Geographic distribution | Yes - hundreds of PoPs | No - single region unless explicitly replicated | No - single location |
| Typical hit latency | 1-10ms (edge-local) | <1ms (L1) to ~0.2-1ms (L2, network hop) | ~1ms (colocated) |
| Best for | Public, geographically spread traffic | Any data needing sub-ms repeated access regardless of geography | Origin offload without geographic distribution |

**Pick CDN when** geography is the dominant latency factor and content is publicly cacheable. **Pick application cache when** the data isn't HTTP-shaped (computed aggregates, session state) or is per-user/private. **Pick a reverse proxy cache when** you want origin offload and HTTP semantics but don't need geographic edge distribution (e.g., an internal service, or a CDN sits in front of it anyway for external traffic).

A managed CDN (CloudFront, Fastly, Cloudflare, Akamai) trades $/GB-served and $/request for zero PoP-operations overhead - building and running your own PoP network is a multi-year, capital-intensive undertaking justified only at hyperscaler traffic volumes (a handful of companies operate their own; everyone else buys the service). At high egress volumes, CDN bandwidth cost becomes a first-order line item, and providers differ meaningfully on egress pricing - worth naming explicitly in a cost-sensitive design.

---

## Cache Invalidation at the Edge

**Mental model:** Purging a CDN is invalidation's hardest case - the writer isn't invalidating one cache node, it's invalidating (or waiting out the TTL of) every PoP that might hold a copy, globally, with no single authority that can atomically flip every edge at once. For the general invalidation strategies (key-based, tag-based, event-driven, versioned keys) this section extends, see [Caching § Cache Invalidation](../components/caching.md#cache-invalidation) - this section covers only what's specific to CDN's globally-distributed edge topology.

### Purge Propagation

A purge API call (`DELETE /cache/{url}` or equivalent) is issued once by the origin but must reach every PoP holding a copy of that URL. Propagation is not instant: most CDNs advertise purge completion in low single-digit seconds globally, achieved via an internal pub/sub or gossip layer between PoPs rather than the origin contacting each PoP directly. During the propagation window, some PoPs serve the new content while others still serve stale - readers in different regions can observe different versions of the same URL simultaneously.

### Soft Purge vs Hard Purge

**Hard purge:** The edge deletes the cached object entirely. The next request is a full miss - it goes to origin (or origin shield) and pays full miss latency, and if many clients request that URL right after a hard purge, it acts like a mini cache-avalanche at that specific edge node.

**Soft purge:** The edge marks the object stale but keeps serving it (optionally via stale-while-revalidate semantics) while asynchronously refetching from origin in the background. Avoids the miss-latency spike for popular URLs at the cost of a brief window where stale content is still served post-purge-call.

> ⚖️ **Decision Framework**
> Hard purge is correct when serving even one stale response is unacceptable (a security-sensitive asset, a legally required takedown). Soft purge is correct for the overwhelming majority of cases - freshness matters but a few seconds of staleness during background refresh costs less than a synchronized miss storm across every PoP that held the object.

### Tag/Surrogate-Key Purge at Edge Scale

Purging by URL doesn't scale when one logical change invalidates many URLs (a product price change affecting the product page, a category listing, and a search-results page). CDN surrogate-key/cache-tag purge (Fastly's Surrogate-Key header, Cloudflare's cache-tag) lets the origin tag responses at cache-time and purge by tag later - the mechanics mirror [Caching § Tag / Surrogate Key Invalidation](../components/caching.md#tag--surrogate-key-invalidation), but at CDN scale, a single tag purge can invalidate objects across every PoP simultaneously in one API call, rather than requiring the origin to enumerate every affected URL.

### Versioned Asset URLs as the Primary Strategy

For static assets (JS/CSS/images), the dominant real-world pattern isn't purge at all - it's cache-busting via a content hash or build version in the filename (`main.a1b2c3.js`). Old versions are simply never requested again and age out via TTL; there's no propagation-lag correctness concern because the old and new versions are different cache keys entirely. This is the same mechanism as [Caching § Versioned Keys](../components/caching.md#versioned-keys-cache-busting), applied to URLs instead of cache keys. Purge APIs exist for the cases this doesn't cover: dynamic/API responses and content whose URL must stay stable (canonical pages, SEO-indexed URLs).

---

## Origin Offload & Origin Shield

**Mental model:** Without a mid-tier, every one of hundreds of PoPs independently misses on a newly-published or newly-cold object and hits the origin directly - the fan-out is PoP-count, not request-count, but it's still a multiplying factor the origin wasn't sized for.

### The Origin Shield Pattern

An origin shield is a single designated mid-tier cache (or a small set, one per origin region) that sits between edge PoPs and the origin. Edge PoPs that miss don't go straight to origin - they go to the shield first. The shield either has the object cached (serves it, no origin hit) or itself misses once, fetches from origin, and serves all the PoPs that hit it during that window. Effectively this collapses N-PoP-concurrent-misses into a single origin request per object, per shield region - the shield does for the origin what single-flight coalescing does for a single cache node against its DB (see [Caching § Mutex / Single-Flight Coalescing](../components/caching.md#mutex--single-flight-coalescing)), just applied one layer up the topology.

### Request Collapsing at the Shield

When multiple edge PoPs miss on the same object within the same short window, the shield coalesces those into a single in-flight origin request rather than issuing one per PoP - the same single-flight principle, applied at the shield tier instead of a single cache node. Without this, a newly-published, suddenly-popular object still produces an origin spike proportional to PoP count on its first few seconds of life, even with a shield present but not deduplicating in-flight fetches.

### Sizing & Placement

An origin shield is typically placed in the same region (or a region with low RTT) as the origin itself, so a shield miss pays one origin round-trip, not an additional cross-region hop on top of the edge-to-shield hop. For a multi-region origin (active-active or read replicas per region), a shield per origin region is standard - each shield fronts its regional origin instance, and edge PoPs are routed to the nearest shield rather than a single global one.

---

## Dynamic & Personalized Content at the Edge

**Mental model:** Not everything the CDN touches is fully cacheable - "CDN or not" isn't binary, it's a spectrum from fully-static to fully-personalized, and the edge layer has mechanisms for the middle of that spectrum.

### Edge Compute (Edge Functions/Workers)

Many modern CDNs run lightweight compute at the edge (Cloudflare Workers, Fastly Compute, CloudFront Functions/Lambda@Edge) - short-lived, resource-constrained functions that execute per-request before or instead of a cache lookup. Common uses: A/B test bucketing, auth-token validation before forwarding to origin, request/response header rewriting, geo-based redirects. This moves logic that would otherwise require an origin round-trip out to the edge, cutting latency for the parts of a request that don't need the origin's full application stack.

**Boundary:** edge compute is for stateless, low-latency, per-request logic - not a place to run application business logic requiring a database, since edge functions are deliberately resource- and runtime-constrained and a DB call from every PoP defeats the purpose of edge placement.

### Assembling Personalization Without Full Cache Bypass

Two patterns keep most of a response cacheable while personalizing a fragment:

**Edge-side includes / fragment caching:** The bulk of a page (layout, static content) is cached at the edge as one object; a personalized fragment (a "Hi, {name}" header, a cart count) is fetched separately, often via a small uncached edge-compute call or a client-side fetch after the cached shell loads.

**Cookie/header-based cache variance with a bounded key:** Vary the cached response on a small, bounded dimension (e.g., a coarse "logged-in vs logged-out" flag, or an A/B bucket ID with a handful of values) rather than on a per-user identifier - keeps cache-key cardinality low while still serving different content to different cohorts. This is the CDN-scale version of the `Vary` footgun in [Caching § CDN as Edge Cache](../components/caching.md#cdn-as-edge-cache-l3---http-cache-semantics-cache-control-directives-etag-vary-stale-while-revalidate) - varying on a genuinely per-user value at the edge produces one cache entry per user, which is functionally uncached.

---

## Security & Hardening

**Mental model:** A CDN sits on the public internet path in front of the origin - it's both an attack surface and, used correctly, the origin's best absorption layer against volumetric attacks.

### DDoS Absorption

Because a CDN's edge capacity is distributed across hundreds of PoPs and typically massively over-provisioned relative to any single origin, volumetric attacks (traffic floods) are absorbed and diffused across the PoP network rather than concentrated on the origin. This is a genuine, load-bearing reason large sites front everything with a CDN even when caching benefit alone wouldn't justify it - most managed CDNs (Cloudflare, CloudFront + Shield, Akamai) bundle DDoS mitigation at the edge as a first-class feature, not an add-on.

### TLS Termination at the Edge

TLS handshakes terminate at the nearest PoP rather than requiring a full-RTT round trip to a distant origin - this materially reduces connection setup latency for HTTPS, especially on TLS 1.2's multiple round trips (TLS 1.3's 1-RTT handshake narrows but doesn't eliminate this benefit). The edge-to-origin leg is then a separate connection, ideally also encrypted (edge-to-origin TLS, sometimes with mutual TLS/origin-pull secrets so the origin only accepts traffic that genuinely came from the CDN, not direct-to-origin bypass attempts).

### Origin IP Exposure

If the origin's real IP is discoverable (leaked in old DNS records, a misconfigured direct-access path, or a subdomain that bypasses the CDN), an attacker can bypass the CDN entirely and attack the origin directly, defeating both the caching and DDoS-absorption benefits. Mitigation: keep the origin IP out of public DNS entirely, enforce origin-pull authentication so the origin only serves the CDN's IP range or a shared secret header, and audit for any subdomain that resolves directly to the origin instead of through the CDN.

### Cache Poisoning via Unkeyed Headers

Covered in depth generically in [Caching § Cache Poisoning](../components/caching.md#cache-poisoning---key-namespacing-input-sanitization); the CDN-specific instance is the highest-blast-radius version of it, since a single poisoned edge cache entry is served to every subsequent client hitting that PoP, not just one user. Always include any header the origin reflects back into the response in the CDN's cache key, or strip/normalize it before it reaches the origin.

---

## Production Failure Modes & Gotchas

### PoP-Local Cache Stampede on Cold Content

A newly-deployed or newly-viral object goes cold-to-hot in seconds. Every PoP that hasn't seen it yet independently misses and fans out to origin (or origin shield) simultaneously - functionally the same failure as [Caching § Cache Stampede](../components/caching.md#cache-stampede--thundering-herd), but the fan-out factor is PoP count, not concurrent-thread count, which is why an origin shield's request-collapsing (see [Origin Offload & Origin Shield](#origin-offload--origin-shield)) matters more here than single-node mutex locking would.

### Stale-Read Window During Purge Propagation

Because purge propagation isn't instant globally (typically low single-digit seconds, but not guaranteed), two users in different regions can legitimately see different content for the same URL for a short window after a purge call returns success. Design consumers to tolerate this, or use versioned URLs for anything where simultaneity actually matters (see [Versioned Asset URLs](#versioned-asset-urls-as-the-primary-strategy)).

### Cache-Key Fragmentation Silently Killing Hit Rate

Covered under [Cache-Key Construction & Fragmentation](#cache-key-construction--fragmentation) - included here because it's the single most common CDN misconfiguration found in production audits: a tracking query parameter or an overly broad `Vary` header quietly turns a would-be 95%+ hit-rate object into a near-0% one, and because the requests still "work" (just slower, all misses), it's easy to miss without explicitly checking per-PoP hit-rate metrics.

### Origin Shield Single Point of Contention

An origin shield collapses fan-out, which is its purpose - but it also means the shield itself becomes a concentration point. If the shield is undersized or a single instance without redundancy, a shield outage removes the fan-out protection entirely and every PoP miss goes straight to origin simultaneously - worse than not having a shield at all, if the origin was sized assuming shield protection. Provision shield capacity and redundancy for the traffic it's meant to absorb, not just origin traffic minus cache hits.

### Multi-CDN Consistency

Large sites often run multiple CDN providers (for redundancy or cost arbitrage) with DNS or client-side logic picking between them. Purge, TTL, and cache-key behavior are not guaranteed identical across providers - a purge issued to one CDN doesn't propagate to the other. Multi-CDN setups need an invalidation strategy that fans out to every provider explicitly, or they need to lean on short TTLs / versioned URLs rather than purge-based invalidation as the primary freshness mechanism.

### Common Misconceptions

- **"A CDN makes dynamic content fast"** - a CDN speeds up what it can cache; fully personalized, uncacheable responses get little benefit beyond TLS termination and routing, and can even add a hop of latency versus a well-placed regional origin.
- **"Purging is instant"** - purge propagation is fast (seconds) but not atomic across PoPs; treat the propagation window as a real, if brief, consistency gap, not an implementation detail to ignore.
- **"CDN caching and application caching solve the same problem"** - a CDN caches HTTP responses at the network edge; it has no visibility into or control over application-level data like session state or computed aggregates - see [CDN vs Application Cache vs Reverse Proxy Cache](#cdn-vs-application-cache-vs-reverse-proxy-cache).

---

## Interview Scenario Bank

> 💬 **First 30 seconds:** "Before deciding whether a CDN fits here, I'd check whether the traffic is geographically distributed and whether the content is shareable across users - a CDN's whole value proposition is caching once and serving many, so a fully personalized, single-region workload gets little from it beyond DDoS absorption and TLS termination."

> 🎯 **Interview Lens**
> **Q:** How would you invalidate a CDN cache when the underlying data changes?
> **Ideal answer:** Depends on the shape of the change - a single-URL update uses a purge API call (soft purge preferred to avoid a miss-storm on popular URLs); a change affecting many URLs uses tag/surrogate-key purge so the origin doesn't have to enumerate every affected page; static assets sidestep purge entirely via versioned/content-hashed URLs, which is the dominant real-world pattern because it has no propagation-lag correctness gap.
> **Common trap:** Assuming purge is instant and atomic across every PoP - it's typically low single-digit seconds, and during that window different regions can serve different content.
> **Next question:** Your purge API call returns success in 200ms but users in Asia report stale content 10 seconds later - what's happening and how do you design around it?

> 🎯 **Interview Lens**
> **Q:** A newly-published article suddenly goes viral. What breaks and how do you protect the origin?
> **Ideal answer:** Every PoP that hasn't yet seen the URL independently misses and fans out to origin simultaneously - fan-out factor is PoP count, not request count. An origin shield collapses this: PoPs miss to the shield, the shield deduplicates concurrent in-flight fetches for the same object (request collapsing) and issues one origin request per object per shield region, not one per PoP.
> **Common trap:** Reaching for "just add more origin capacity" - that scales linearly with traffic but doesn't fix the structural fan-out multiplier; the shield fixes the multiplier itself.
> **Next question:** What happens if the origin shield itself goes down during that traffic spike?
> **Next question:** How would this differ if the origin has read replicas in multiple regions instead of a single origin?

> 🎯 **Interview Lens**
> **Q:** How does a CDN route a client's request to the right PoP, and what happens on PoP failure?
> **Ideal answer:** Either anycast (same IP announced from every PoP via BGP, routing picks nearest by AS-path, failover via BGP withdrawal in seconds) or GeoDNS (resolver-location-based DNS answers, TTL-bounded failover, finer steering control). Most large CDNs combine both - anycast for coarse entry and resilience, DNS/HTTP-layer steering for fine-grained load shifting.
> **Common trap:** Treating "geographically nearest" as literal physical distance - anycast/BGP routing picks shortest AS-path, which usually but not always correlates with physical proximity.
> **Next question:** If you needed to shed 20% of traffic away from one overloaded-but-healthy PoP without taking it fully offline, which routing mechanism gives you that control and why?

> 🎯 **Interview Lens**
> **Q:** Your CDN hit rate dropped from 96% to 40% after a deploy with no traffic change. What do you check first?
> **Ideal answer:** Cache-key fragmentation - check whether the deploy introduced a new query parameter (tracking, cache-busting param applied too broadly) or widened a `Vary` header, both of which multiply the effective number of distinct cache keys for what's semantically the same content. Confirm via per-PoP hit-rate and unique-cache-key-count metrics, not just aggregate hit rate.
> **Common trap:** Assuming the origin got slower or the CDN itself is misbehaving, and investigating infrastructure health before checking the cache-key configuration - the fragmentation cause is far more common than an actual CDN outage.
> **Next question:** The new query parameter turns out to be a required session-tracking ID the frontend team can't remove - how do you get the hit rate back without breaking their tracking?

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| CDN | Content Delivery Network | Distributed edge-cache network that serves content close to users |
| PoP | Point of Presence | A CDN's physical/virtual edge location running cache servers |
| BGP | Border Gateway Protocol | Internet routing protocol anycast relies on for nearest-PoP delivery |
| TTL | Time To Live | Duration a cached object is considered fresh before re-validation |
| RTT | Round-Trip Time | Time for a request to reach a server and its response to return |

### Anti-patterns

- **Varying cache key on a per-user or per-session identifier** - fragments the cache into effectively one entry per user, defeating the purpose of edge caching; use a coarse bucket (logged-in/out, A/B cohort) instead.
- **Relying solely on purge APIs for high-frequency-changing content** - purge has propagation lag and API rate limits; short TTLs or versioned URLs are the correct primary mechanism, purge is the exception-path tool.
- **No origin shield in front of a multi-hundred-PoP deployment** - leaves the origin exposed to PoP-count-multiplied fan-out on every cold or newly-viral object.
- **Leaving the origin's real IP publicly resolvable** - lets attackers bypass the CDN's caching and DDoS absorption entirely by hitting the origin directly.

### Selection Matrix

| Variant | Failover Speed | Routing Precision | Operational Complexity | Best For |
| --- | --- | --- | --- | --- |
| Anycast (BGP) | Seconds (BGP convergence) | Coarse (AS-path nearest) | Low - one IP everywhere | Baseline entry routing, resilience |
| GeoDNS | TTL-bounded (minutes) | Fine (per-resolver, weighted, health-aware) | Medium - DNS infra + health checks | Precise load shifting, gradual rollouts |
| Anycast + DNS/HTTP steering (combined) | Seconds for gross failover, fine control layered on top | High | Highest | Large-scale production CDNs |
